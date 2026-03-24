from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


SysId = Annotated[str, Field(pattern=r"^[a-f0-9]{32}$", description="32-char hex ServiceNow sys_id")]


class TimestampedMixin(BaseModel):
    query_time_ms: float = Field(description="Server-side query duration in milliseconds")
    cached: bool = Field(default=False, description="Whether the response came from cache")


class ErrorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    detail: str
    type: str
    status_code: int
    request_id: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PaginatedRequest(BaseModel):
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0, le=10000)
