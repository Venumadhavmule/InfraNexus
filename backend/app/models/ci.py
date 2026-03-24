from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import SysId, TimestampedMixin


class RelationshipSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rel_type: str
    ci_id: SysId
    ci_name: str
    ci_class: str


class CIDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sys_id: SysId
    name: str
    sys_class_name: str
    class_label: str
    environment: str
    operational_status: int
    ip_address: str = ""
    fqdn: str = ""
    os: str = ""
    os_version: str = ""
    cpu_count: int | None = None
    ram_mb: int | None = None
    disk_space_gb: float | None = None
    location: str = ""
    department: str = ""
    assigned_to: str = ""
    support_group: str = ""
    short_description: str = ""
    sys_created_on: datetime | None = None
    sys_updated_on: datetime | None = None
    degree: int = 0
    cluster_id: int = -1
    relationships_incoming: list[RelationshipSummary] = Field(default_factory=list)
    relationships_outgoing: list[RelationshipSummary] = Field(default_factory=list)


class CITimelineEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timestamp: datetime
    change_type: str
    field: str | None = None
    old_value: str | None = None
    new_value: str | None = None


class CITimelineResponse(TimestampedMixin):
    ci_id: SysId
    changes: list[CITimelineEntry] = Field(default_factory=list)
    total_changes: int = 0
