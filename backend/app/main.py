from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from app.config import settings
from app.core.kuzu_manager import KuzuManager
from app.core.meili_manager import MeiliManager
from app.core.redis_manager import RedisManager
from app.core.ws_manager import ConnectionManager
from app.exceptions import (
    InfraNexusError,
    infranexus_error_handler,
    unhandled_error_handler,
    validation_error_handler,
)
from app.logging import get_logger, setup_logging
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.request_id import RequestIdMiddleware
from app.middleware.timing import TimingMiddleware
from app.routers import ci, etl, graph, health, search, ws

log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    setup_logging()
    log.info("app.starting")

    # Kuzu
    kuzu = KuzuManager(settings.KUZU_DB_PATH)
    await kuzu.bootstrap_schema()
    app.state.kuzu = kuzu

    # Redis
    redis = RedisManager(settings.REDIS_URL)
    await redis.connect()
    app.state.redis = redis

    # Meilisearch
    meili = MeiliManager(settings.MEILI_URL, settings.MEILI_MASTER_KEY)
    await meili.connect()
    await meili.bootstrap_index()
    app.state.meili = meili

    # WebSocket manager
    app.state.ws_manager = ConnectionManager()

    # ETL (lazy import to avoid circular deps)
    from etl.state_manager import ETLStateManager
    from etl.runner import ETLRunner
    from etl.scheduler import ETLScheduler

    state_mgr = ETLStateManager(redis)
    app.state.etl_state_manager = state_mgr

    from etl.snow_client import SnowClient

    snow = SnowClient(settings.SNOW_INSTANCE, settings.SNOW_USERNAME, settings.SNOW_PASSWORD)
    runner = ETLRunner(
        snow=snow, kuzu=kuzu, meili=meili, redis=redis,
        state_mgr=state_mgr, ws_manager=app.state.ws_manager,
    )
    app.state.etl_runner = runner

    scheduler = ETLScheduler(runner, state_mgr, settings.ETL_SYNC_INTERVAL_MIN)
    await scheduler.start()
    app.state.etl_scheduler = scheduler

    log.info("app.started")
    yield

    # Shutdown
    log.info("app.shutting_down")
    await scheduler.stop()
    await meili.disconnect()
    await redis.disconnect()
    await kuzu.close()
    log.info("app.stopped")


def create_app() -> FastAPI:
    app = FastAPI(
        title="InfraNexus",
        version="0.1.0",
        description="ServiceNow CMDB Graph Visualizer API",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Exception handlers
    app.add_exception_handler(InfraNexusError, infranexus_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(ValidationError, validation_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_error_handler)

    # Middleware (order: last added = first executed)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(TimingMiddleware)
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_credentials=True,
        max_age=3600,
    )

    # Routers
    app.include_router(health.router)
    app.include_router(graph.router)
    app.include_router(ci.router)
    app.include_router(search.router)
    app.include_router(etl.router)
    app.include_router(ws.router)

    return app


app = create_app()
