from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
import uuid

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from app.config import settings
from app.core.stubs import StubKuzuManager, StubMeiliManager, StubRedisManager
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

    # --- Kuzu ---
    if settings.KUZU_ENABLED:
        from app.core.kuzu_manager import KuzuManager
        kuzu = KuzuManager(settings.KUZU_DB_PATH)
        await kuzu.bootstrap_schema()
    else:
        kuzu = StubKuzuManager(settings.KUZU_DB_PATH)  # type: ignore[assignment]
        await kuzu.bootstrap_schema()
    app.state.kuzu = kuzu

    # --- Redis ---
    if settings.REDIS_ENABLED:
        from app.core.redis_manager import RedisManager
        redis = RedisManager(settings.REDIS_URL)
        await redis.connect()
    else:
        redis = StubRedisManager(settings.REDIS_URL)  # type: ignore[assignment]
        await redis.connect()
    app.state.redis = redis

    # --- Meilisearch ---
    if settings.MEILI_ENABLED:
        from app.core.meili_manager import MeiliManager
        meili = MeiliManager(settings.MEILI_URL, settings.MEILI_MASTER_KEY)
        await meili.connect()
        await meili.bootstrap_index()
    else:
        meili = StubMeiliManager(settings.MEILI_URL, settings.MEILI_MASTER_KEY)  # type: ignore[assignment]
        await meili.connect()
        await meili.bootstrap_index()
    app.state.meili = meili

    # --- WebSocket manager ---
    app.state.ws_manager = ConnectionManager()

    # --- ETL (requires Kuzu; uses stubs for Redis/Meili when disabled) ---
    if settings.ETL_ENABLED and settings.KUZU_ENABLED:
        from etl.state_manager import ETLStateManager
        from etl.runner import ETLRunner
        from etl.scheduler import ETLScheduler
        from etl.snow_client import SnowClient

        state_mgr = ETLStateManager(redis, settings.ETL_STATE_PATH)
        await state_mgr.recover_if_running()
        app.state.etl_state_manager = state_mgr

        snow = SnowClient(settings.SNOW_INSTANCE, settings.SNOW_USERNAME, settings.SNOW_PASSWORD)
        runner = ETLRunner(
            snow=snow, kuzu=kuzu, meili=meili, redis=redis,
            state_mgr=state_mgr, ws_manager=app.state.ws_manager,
        )
        app.state.etl_runner = runner

        scheduler = ETLScheduler(runner, state_mgr, settings.ETL_SYNC_INTERVAL_MIN)
        await scheduler.start()
        app.state.etl_scheduler = scheduler

        if settings.ETL_BOOTSTRAP_IF_EMPTY and not await kuzu.has_ci_data():
            sync_id = uuid.uuid4().hex[:12]
            await state_mgr.set_running(sync_id, "full")
            asyncio.create_task(runner.run_full_sync(sync_id))
            log.info("app.etl_bootstrap_scheduled", sync_id=sync_id)
    else:
        app.state.etl_state_manager = None
        app.state.etl_runner = None
        app.state.etl_scheduler = None
        if not settings.ETL_ENABLED:
            log.info("app.etl_disabled")

    log.info(
        "app.started",
        kuzu_enabled=settings.KUZU_ENABLED,
        redis_enabled=settings.REDIS_ENABLED,
        meili_enabled=settings.MEILI_ENABLED,
        etl_enabled=settings.ETL_ENABLED,
    )
    yield

    # Shutdown
    log.info("app.shutting_down")
    if app.state.etl_scheduler is not None:
        await app.state.etl_scheduler.stop()
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
