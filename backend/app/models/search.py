from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import SysId, TimestampedMixin


class SearchHit(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sys_id: SysId
    name: str
    class_label: str
    environment: str = ""
    operational_status: int = 1
    ip_address: str = ""
    short_description: str = ""
    highlight: dict[str, str] = Field(default_factory=dict, alias="_highlight")


class SearchResponse(TimestampedMixin):
    hits: list[SearchHit]
    total: int
    facets: dict[str, dict[str, int]] = Field(default_factory=dict)
    limit: int
    offset: int


class SuggestHit(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    text: str
    ci_id: SysId
    class_label: str


class SuggestResponse(TimestampedMixin):
    suggestions: list[SuggestHit]
    query: str
