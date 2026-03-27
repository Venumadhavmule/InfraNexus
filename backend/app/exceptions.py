from __future__ import annotations

from datetime import datetime

from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.logging import get_logger, request_id_ctx
from app.models.base import ErrorResponse

log = get_logger(__name__)


# --- Base ---

class InfraNexusError(Exception):
    status_code: int = 500
    error_type: str = "internal_error"

    def __init__(self, detail: str = "An internal error occurred") -> None:
        self.detail = detail
        super().__init__(detail)

    def to_response(self) -> ErrorResponse:
        return ErrorResponse(
            detail=self.detail,
            type=self.error_type,
            status_code=self.status_code,
            request_id=request_id_ctx.get(),
            timestamp=datetime.utcnow(),
        )


# --- 400 Bad Request ---

class InvalidSysIdError(InfraNexusError):
    status_code = 400
    error_type = "invalid_sys_id"

    def __init__(self, value: str) -> None:
        super().__init__(f"Invalid sys_id format: '{value}'. Expected 32 lowercase hex characters.")


# --- 404 Not Found ---

class CINotFoundError(InfraNexusError):
    status_code = 404
    error_type = "ci_not_found"

    def __init__(self, ci_id: str) -> None:
        super().__init__(f"CI with sys_id '{ci_id}' not found")


class PathNotFoundError(InfraNexusError):
    status_code = 404
    error_type = "path_not_found"

    def __init__(self, source_id: str, target_id: str) -> None:
        super().__init__(f"No path between '{source_id}' and '{target_id}'")


# --- 409 Conflict ---

class ETLAlreadyRunningError(InfraNexusError):
    status_code = 409
    error_type = "etl_already_running"

    def __init__(self, sync_id: str) -> None:
        super().__init__(f"ETL sync '{sync_id}' is already running")


# --- 429 Rate Limit ---

class RateLimitExceededError(InfraNexusError):
    status_code = 429
    error_type = "rate_limit_exceeded"

    def __init__(self, ip: str, retry_after: int) -> None:
        self.retry_after = retry_after
        super().__init__(f"Rate limit exceeded for {ip}. Retry after {retry_after}s.")


# --- 500 Internal ---

class KuzuQueryError(InfraNexusError):
    status_code = 500
    error_type = "kuzu_query_error"

    def __init__(self, query_name: str, detail: str) -> None:
        log.error("kuzu_query_error", query_name=query_name, detail=detail)
        super().__init__("A database query error occurred")


# --- 503 Service Unavailable ---

class KuzuConnectionError(InfraNexusError):
    status_code = 503
    error_type = "kuzu_unavailable"

    def __init__(self) -> None:
        super().__init__("Graph database is unavailable")


class RedisConnectionError(InfraNexusError):
    status_code = 503
    error_type = "redis_unavailable"

    def __init__(self) -> None:
        super().__init__("Cache service is unavailable")


class MeiliConnectionError(InfraNexusError):
    status_code = 503
    error_type = "meili_unavailable"

    def __init__(self) -> None:
        super().__init__("Search service is unavailable")


class SnowAuthError(InfraNexusError):
    status_code = 503
    error_type = "snow_auth_error"

    def __init__(self) -> None:
        super().__init__("ServiceNow authentication failed")


class SnowRateLimitError(InfraNexusError):
    status_code = 503
    error_type = "snow_rate_limited"

    def __init__(self, retry_after: int) -> None:
        self.retry_after = retry_after
        super().__init__(f"ServiceNow rate limited. Retry after {retry_after}s.")


class SnowTimeoutError(InfraNexusError):
    status_code = 503
    error_type = "snow_timeout"

    def __init__(self) -> None:
        super().__init__("ServiceNow request timed out")


class SnowResponseError(InfraNexusError):
    status_code = 503
    error_type = "snow_response_error"

    def __init__(self, reason: str) -> None:
        super().__init__(f"ServiceNow returned an invalid response: {reason}")


class ETLSyncFailedError(InfraNexusError):
    status_code = 500
    error_type = "etl_sync_failed"

    def __init__(self, reason: str) -> None:
        log.error("etl_sync_failed", reason=reason)
        super().__init__("ETL synchronization failed")


# --- Global Exception Handlers ---

async def infranexus_error_handler(request: Request, exc: InfraNexusError) -> JSONResponse:
    resp = exc.to_response()
    headers: dict[str, str] = {}
    if isinstance(exc, RateLimitExceededError):
        headers["Retry-After"] = str(exc.retry_after)
    return JSONResponse(
        status_code=exc.status_code,
        content=resp.model_dump(mode="json"),
        headers=headers,
    )


async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    log.warning("validation_error", errors=exc.errors(), url=str(request.url))
    resp = ErrorResponse(
        detail="Validation error",
        type="validation_error",
        status_code=422,
        request_id=request_id_ctx.get(),
        timestamp=datetime.utcnow(),
    )
    return JSONResponse(status_code=422, content=resp.model_dump(mode="json"))


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    log.exception("unhandled_error", error=str(exc))
    resp = ErrorResponse(
        detail="An unexpected error occurred",
        type="internal_error",
        status_code=500,
        request_id=request_id_ctx.get(),
        timestamp=datetime.utcnow(),
    )
    return JSONResponse(status_code=500, content=resp.model_dump(mode="json"))
