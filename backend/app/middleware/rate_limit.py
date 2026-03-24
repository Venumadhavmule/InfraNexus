from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings
from app.logging import get_logger

log = get_logger(__name__)

_SKIP_PATHS = {"/health", "/ready", "/docs", "/openapi.json", "/redoc"}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path in _SKIP_PATHS:
            return await call_next(request)

        redis = getattr(request.app.state, "redis", None)
        if redis is None:
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        key = f"rl:{client_ip}"

        allowed = await redis.sliding_window_check(
            key, window=60, limit=settings.RATE_LIMIT_PER_MIN
        )

        if not allowed:
            log.warning("rate_limit.exceeded", ip=client_ip)
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Rate limit exceeded. Max {settings.RATE_LIMIT_PER_MIN} requests per minute.",
                    "type": "rate_limit_exceeded",
                    "status_code": 429,
                },
                headers={"Retry-After": "60"},
            )

        return await call_next(request)

    @staticmethod
    def _get_client_ip(request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        client = request.client
        return client.host if client else "unknown"
