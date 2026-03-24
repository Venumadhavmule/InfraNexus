from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class SyncType(str, Enum):
    full = "full"
    incremental = "incremental"


class SyncStatus(str, Enum):
    idle = "idle"
    running = "running"
    failed = "failed"


class SyncRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    type: SyncType = SyncType.incremental


class SyncTriggerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sync_id: str
    type: SyncType
    status: SyncStatus
    started_at: datetime = Field(default_factory=datetime.utcnow)


class ETLStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: SyncStatus
    last_sync_type: SyncType | None = None
    last_sync_timestamp: datetime | None = None
    last_sync_duration_seconds: float | None = None
    last_sync_ci_count: int | None = None
    last_sync_rel_count: int | None = None
    last_sync_error: str | None = None
    next_scheduled_sync: datetime | None = None


class ETLLogEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timestamp: datetime
    level: str
    message: str


class ETLLogsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    logs: list[ETLLogEntry] = Field(default_factory=list)
    total: int = 0
