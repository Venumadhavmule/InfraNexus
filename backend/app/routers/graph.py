from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_graph_service
from app.models.base import SysId
from app.models.graph import (
    ClustersResponse,
    GraphStatsResponse,
    NeighborhoodResponse,
    PathResponse,
)
from app.services.graph_service import GraphService

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get(
    "/neighborhood/{ci_id}",
    response_model=NeighborhoodResponse,
    summary="Get k-hop neighborhood of a CI",
)
async def get_neighborhood(
    ci_id: SysId,
    graph: Annotated[GraphService, Depends(get_graph_service)],
    hops: Annotated[int, Query(ge=1, le=3)] = 1,
    max_nodes: Annotated[int | None, Query(ge=1, le=2000)] = None,
    degree_threshold: Annotated[int | None, Query(ge=1)] = None,
    class_filter: Annotated[list[str] | None, Query(alias="class")] = None,
    env_filter: Annotated[list[str] | None, Query(alias="env")] = None,
) -> NeighborhoodResponse:
    return await graph.get_neighborhood(
        ci_id,
        hops=hops,
        max_nodes=max_nodes,
        degree_threshold=degree_threshold,
        class_filter=class_filter,
        env_filter=env_filter,
    )


@router.get(
    "/path/{source_id}/{target_id}",
    response_model=PathResponse,
    summary="Find shortest paths between two CIs",
)
async def get_path(
    source_id: SysId,
    target_id: SysId,
    graph: Annotated[GraphService, Depends(get_graph_service)],
    max_length: Annotated[int, Query(ge=1, le=10)] = 5,
    max_paths: Annotated[int, Query(ge=1, le=10)] = 3,
) -> PathResponse:
    return await graph.get_path(
        source_id, target_id, max_length=max_length, max_paths=max_paths
    )


@router.get(
    "/clusters",
    response_model=ClustersResponse,
    summary="List cluster summaries",
)
async def get_clusters(
    graph: Annotated[GraphService, Depends(get_graph_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    min_size: Annotated[int, Query(ge=1)] = 2,
) -> ClustersResponse:
    return await graph.get_clusters(limit=limit, min_size=min_size)


@router.get(
    "/stats",
    response_model=GraphStatsResponse,
    summary="Graph-wide statistics",
)
async def get_stats(
    graph: Annotated[GraphService, Depends(get_graph_service)],
) -> GraphStatsResponse:
    return await graph.get_stats()
