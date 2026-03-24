from __future__ import annotations

import time
from datetime import datetime

from fastapi import APIRouter, Request

from app.models.health import DependencyCheck, HealthResponse, ReadyResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="Liveness probe")
async def health() -> HealthResponse:
    return HealthResponse(status="ok", timestamp=datetime.utcnow())


@router.get("/ready", response_model=ReadyResponse, summary="Readiness probe")
async def ready(request: Request) -> ReadyResponse:
    checks: dict[str, DependencyCheck] = {}

    # Kuzu
    kuzu = getattr(request.app.state, "kuzu", None)
    if kuzu:
        try:
            t0 = time.monotonic()
            await kuzu.read_query("RETURN 1 AS ok", {})
            latency = (time.monotonic() - t0) * 1000
            checks["kuzu"] = DependencyCheck(status="ready", latency_ms=round(latency, 2))
        except Exception:
            checks["kuzu"] = DependencyCheck(status="not_ready")
    else:
        checks["kuzu"] = DependencyCheck(status="not_ready")

    # Redis
    redis = getattr(request.app.state, "redis", None)
    if redis:
        try:
            t0 = time.monotonic()
            ok = await redis.health_check()
            latency = (time.monotonic() - t0) * 1000
            checks["redis"] = DependencyCheck(
                status="ready" if ok else "not_ready",
                latency_ms=round(latency, 2),
            )
        except Exception:
            checks["redis"] = DependencyCheck(status="not_ready")
    else:
        checks["redis"] = DependencyCheck(status="not_ready")

    # Meilisearch
    meili = getattr(request.app.state, "meili", None)
    if meili:
        try:
            t0 = time.monotonic()
            ok = await meili.health_check()
            latency = (time.monotonic() - t0) * 1000
            checks["meilisearch"] = DependencyCheck(
                status="ready" if ok else "not_ready",
                latency_ms=round(latency, 2),
            )
        except Exception:
            checks["meilisearch"] = DependencyCheck(status="not_ready")
    else:
        checks["meilisearch"] = DependencyCheck(status="not_ready")

    all_ready = all(c.status == "ready" for c in checks.values())
    return ReadyResponse(
        status="ready" if all_ready else "not_ready",
        checks=checks,
        timestamp=datetime.utcnow(),
    )
