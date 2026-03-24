from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import SysId, TimestampedMixin


class ClassCount(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    ci_class: str
    count: int


class TypeCount(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    rel_type: str
    count: int


class EnvCount(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    environment: str
    count: int


class GraphNode(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: SysId
    name: str
    ci_class: str
    ci_class_raw: str
    environment: str
    operational_status: int
    degree: int = 0
    cluster_id: int = -1
    x: float | None = None
    y: float | None = None
    z: float | None = None


class GraphEdge(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    source: SysId
    target: SysId
    rel_type: str
    rel_type_reverse: str = ""


class NeighborhoodResponse(TimestampedMixin):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    center_id: SysId
    total_in_neighborhood: int
    truncated: bool = False


class PathStep(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    path: list[SysId]
    length: int
    edge_types: list[str] = Field(default_factory=list)


class PathResponse(TimestampedMixin):
    paths: list[PathStep]
    source_id: SysId
    target_id: SysId
    exists: bool


class CISample(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    sys_id: SysId
    name: str
    ci_class: str


class ClusterSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    cluster_id: int
    size: int
    label: str = ""
    top_ci_classes: list[ClassCount] = Field(default_factory=list)
    sample_cis: list[CISample] = Field(default_factory=list)


class ClustersResponse(TimestampedMixin):
    clusters: list[ClusterSummary]
    total_clusters: int


class GraphStatsResponse(TimestampedMixin):
    total_nodes: int
    total_edges: int
    avg_degree: float
    max_degree: int
    ci_class_distribution: list[ClassCount] = Field(default_factory=list)
    rel_type_distribution: list[TypeCount] = Field(default_factory=list)
    env_distribution: list[EnvCount] = Field(default_factory=list)
