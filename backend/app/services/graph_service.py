from __future__ import annotations

import time
from typing import Any

from app.config import settings
from app.core.kuzu_manager import KuzuManager
from app.exceptions import CINotFoundError, KuzuQueryError
from app.logging import get_logger
from app.models.graph import (
    ClassCount,
    ClusterSummary,
    ClustersResponse,
    CISample,
    EnvCount,
    GraphEdge,
    GraphNode,
    GraphStatsResponse,
    NeighborhoodResponse,
    PathResponse,
    PathStep,
    TypeCount,
)
from app.queries import neighborhood as nb_q
from app.queries import path as path_q
from app.queries import stats as stats_q
from app.services.cache_service import CacheService

log = get_logger(__name__)


class GraphService:
    def __init__(self, kuzu: KuzuManager, cache: CacheService) -> None:
        self._kuzu = kuzu
        self._cache = cache

    async def get_neighborhood(
        self,
        ci_id: str,
        *,
        hops: int = 1,
        max_nodes: int | None = None,
        degree_threshold: int | None = None,
        class_filter: list[str] | None = None,
        env_filter: list[str] | None = None,
    ) -> NeighborhoodResponse:
        if max_nodes is None:
            max_nodes = settings.MAX_NODES_DEFAULT
        if degree_threshold is None:
            degree_threshold = settings.DEGREE_THRESHOLD_DEFAULT

        filter_hash = CacheService.hash_filters(
            classes=class_filter, envs=env_filter,
            max_nodes=max_nodes, degree_threshold=degree_threshold,
        )

        cached = await self._cache.get_neighborhood(ci_id, hops, filter_hash)
        if cached is not None:
            return NeighborhoodResponse(**cached, cached=True, query_time_ms=0.0)

        t0 = time.monotonic()

        center_rows = await self._kuzu.read_query(
            nb_q.CENTER_NODE, {"ci_id": ci_id}
        )
        if not center_rows:
            raise CINotFoundError(ci_id)

        query, params = self._select_neighborhood_query(
            ci_id, hops, max_nodes, degree_threshold, class_filter, env_filter
        )

        try:
            neighbor_rows = await self._kuzu.read_query(query, params)
        except Exception as e:
            raise KuzuQueryError("neighborhood", str(e)) from e

        all_rows = center_rows + neighbor_rows
        nodes = [GraphNode(**row) for row in all_rows]
        node_ids = [n.id for n in nodes]

        edge_rows = await self._kuzu.read_query(
            nb_q.NEIGHBORHOOD_EDGES, {"node_ids": node_ids}
        )
        edges = [GraphEdge(**row) for row in edge_rows]

        count_rows = await self._kuzu.read_query(
            nb_q.NEIGHBORHOOD_COUNT.replace("{hops}", str(hops)),
            {"ci_id": ci_id},
        )
        total_in_neighborhood = count_rows[0]["total"] if count_rows else len(nodes)
        truncated = len(nodes) < total_in_neighborhood

        elapsed_ms = (time.monotonic() - t0) * 1000

        response = NeighborhoodResponse(
            nodes=nodes,
            edges=edges,
            center_id=ci_id,
            total_in_neighborhood=total_in_neighborhood,
            truncated=truncated,
            query_time_ms=round(elapsed_ms, 2),
            cached=False,
        )

        await self._cache.set_neighborhood(
            ci_id, hops, filter_hash,
            response.model_dump(mode="json"),
            settings.CACHE_NEIGHBORHOOD_TTL,
        )

        return response

    async def get_path(
        self,
        source_id: str,
        target_id: str,
        *,
        max_length: int = 5,
        max_paths: int = 3,
    ) -> PathResponse:
        t0 = time.monotonic()

        query = path_q.ALL_SHORTEST_PATHS.replace("{max_length}", str(max_length))
        try:
            rows = await self._kuzu.read_query(
                query,
                {"source_id": source_id, "target_id": target_id, "max_paths": max_paths},
            )
        except Exception as e:
            raise KuzuQueryError("path", str(e)) from e

        paths: list[PathStep] = []
        for row in rows:
            node_ids = [n["sys_id"] if isinstance(n, dict) else str(n) for n in row["path_nodes"]]
            edge_types = [r["rel_type"] if isinstance(r, dict) else "" for r in row["path_rels"]]
            paths.append(PathStep(path=node_ids, length=row["path_length"], edge_types=edge_types))

        elapsed_ms = (time.monotonic() - t0) * 1000
        return PathResponse(
            paths=paths,
            source_id=source_id,
            target_id=target_id,
            exists=len(paths) > 0,
            query_time_ms=round(elapsed_ms, 2),
            cached=False,
        )

    async def get_clusters(
        self, *, limit: int = 20, min_size: int = 2
    ) -> ClustersResponse:
        t0 = time.monotonic()

        overview_rows = await self._kuzu.read_query(
            stats_q.CLUSTER_OVERVIEW, {"limit": limit}
        )

        clusters: list[ClusterSummary] = []
        for row in overview_rows:
            if row["size"] < min_size:
                continue
            cid = row["cluster_id"]
            detail_rows = await self._kuzu.read_query(
                stats_q.CLUSTER_DETAIL, {"cluster_id": cid}
            )
            sample_rows = await self._kuzu.read_query(
                stats_q.CLUSTER_SAMPLES, {"cluster_id": cid}
            )
            clusters.append(
                ClusterSummary(
                    cluster_id=cid,
                    size=row["size"],
                    top_ci_classes=[ClassCount(**r) for r in detail_rows[:5]],
                    sample_cis=[CISample(**r) for r in sample_rows],
                )
            )

        elapsed_ms = (time.monotonic() - t0) * 1000
        return ClustersResponse(
            clusters=clusters,
            total_clusters=len(clusters),
            query_time_ms=round(elapsed_ms, 2),
            cached=False,
        )

    async def get_stats(self) -> GraphStatsResponse:
        t0 = time.monotonic()

        stats_rows = await self._kuzu.read_query(stats_q.GRAPH_STATS, {})
        class_rows = await self._kuzu.read_query(stats_q.CLASS_DISTRIBUTION, {})
        rel_rows = await self._kuzu.read_query(stats_q.RELATIONSHIP_DISTRIBUTION, {})
        env_rows = await self._kuzu.read_query(stats_q.ENVIRONMENT_DISTRIBUTION, {})

        s = stats_rows[0] if stats_rows else {}
        elapsed_ms = (time.monotonic() - t0) * 1000

        return GraphStatsResponse(
            total_nodes=s.get("total_nodes", 0),
            total_edges=s.get("total_edges", 0),
            avg_degree=round(s.get("avg_degree", 0.0), 2),
            max_degree=s.get("max_degree", 0),
            ci_class_distribution=[ClassCount(**r) for r in class_rows],
            rel_type_distribution=[TypeCount(**r) for r in rel_rows],
            env_distribution=[EnvCount(**r) for r in env_rows],
            query_time_ms=round(elapsed_ms, 2),
            cached=False,
        )

    async def get_starter_scene(
        self,
        *,
        max_nodes: int | None = None,
        degree_threshold: int | None = None,
    ) -> NeighborhoodResponse:
        center_rows = await self._kuzu.read_query(nb_q.STARTER_CENTER, {})
        if not center_rows:
            raise CINotFoundError("starter-scene")

        center_id = center_rows[0]["sys_id"]
        return await self.get_neighborhood(
            center_id,
            hops=1,
            max_nodes=max_nodes,
            degree_threshold=degree_threshold,
        )

    def _select_neighborhood_query(
        self,
        ci_id: str,
        hops: int,
        max_nodes: int,
        degree_threshold: int,
        class_filter: list[str] | None,
        env_filter: list[str] | None,
    ) -> tuple[str, dict[str, Any]]:
        params: dict[str, Any] = {
            "ci_id": ci_id,
            "degree_threshold": degree_threshold,
            "max_nodes": max_nodes,
        }

        has_class = class_filter is not None and len(class_filter) > 0
        has_env = env_filter is not None and len(env_filter) > 0

        if has_class and has_env:
            template = nb_q.NEIGHBORHOOD_WITH_BOTH_FILTERS
            params["classes"] = class_filter
            params["envs"] = env_filter
        elif has_class:
            template = nb_q.NEIGHBORHOOD_WITH_CLASS_FILTER
            params["classes"] = class_filter
        elif has_env:
            template = nb_q.NEIGHBORHOOD_WITH_ENV_FILTER
            params["envs"] = env_filter
        else:
            template = nb_q.NEIGHBORHOOD_BASIC

        query = template.replace("{hops}", str(hops))
        return query, params
