from __future__ import annotations

import time
from datetime import datetime

from fastapi import APIRouter, Request

from app.config import settings
from app.models.health import DependencyCheck, HealthResponse, ReadyResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="Liveness probe")
async def health() -> HealthResponse:
    return HealthResponse(status="ok", timestamp=datetime.utcnow())


@router.get("/ready", response_model=ReadyResponse, summary="Readiness probe")
async def ready(request: Request) -> ReadyResponse:
    checks: dict[str, DependencyCheck] = {}

    # Kuzu
    if not settings.KUZU_ENABLED:
        checks["kuzu"] = DependencyCheck(status="not_ready", latency_ms=None)
    else:
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
    if not settings.REDIS_ENABLED:
        checks["redis"] = DependencyCheck(status="not_ready", latency_ms=None)
    else:
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
    if not settings.MEILI_ENABLED:
        checks["meilisearch"] = DependencyCheck(status="not_ready", latency_ms=None)
    else:
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

    # When services are disabled, still report as "ready" for the app itself
    enabled_checks = []
    if settings.KUZU_ENABLED:
        enabled_checks.append(checks["kuzu"])
    if settings.REDIS_ENABLED:
        enabled_checks.append(checks["redis"])
    if settings.MEILI_ENABLED:
        enabled_checks.append(checks["meilisearch"])

    all_ready = all(c.status == "ready" for c in enabled_checks) if enabled_checks else True
    return ReadyResponse(
        status="ready" if all_ready else "not_ready",
        checks=checks,
        timestamp=datetime.utcnow(),
    )
