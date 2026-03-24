from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DependencyCheck(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    status: Literal["ready", "not_ready"]
    latency_ms: float | None = None


class HealthResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    status: Literal["ok", "degraded", "down"]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ReadyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    status: Literal["ready", "not_ready"]
    checks: dict[str, DependencyCheck]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
