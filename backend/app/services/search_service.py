from __future__ import annotations

import time
from typing import Any

from app.config import settings
from app.core.kuzu_manager import KuzuManager
from app.logging import get_logger
from app.models.search import SearchHit, SearchResponse, SuggestHit, SuggestResponse
from app.queries import search as search_q
from app.services.cache_service import CacheService

log = get_logger(__name__)


class SearchService:
    def __init__(self, meili: Any, kuzu: KuzuManager, cache: CacheService) -> None:
        self._meili = meili
        self._kuzu = kuzu
        self._cache = cache

    async def search(
        self,
        query: str,
        *,
        class_filter: list[str] | None = None,
        env_filter: list[str] | None = None,
        status_filter: list[int] | None = None,
        limit: int = 20,
        offset: int = 0,
        sort: str | None = None,
    ) -> SearchResponse:
        if not settings.MEILI_ENABLED:
            return await self._kuzu_search(
                query,
                class_filter=class_filter,
                env_filter=env_filter,
                limit=limit,
                offset=offset,
            )

        filter_hash = CacheService.hash_filters(
            q=query, classes=class_filter, envs=env_filter,
            status=status_filter, limit=limit, offset=offset, sort=sort,
        )

        cached = await self._cache.get_search(filter_hash)
        if cached is not None:
            return SearchResponse(**cached)

        t0 = time.monotonic()

        filter_str = self._build_filter(class_filter, env_filter, status_filter)
        sort_list = [sort] if sort else None

        result = await self._meili.search(
            query, filter_str=filter_str, limit=limit, offset=offset, sort=sort_list
        )

        hits = [
            SearchHit(
                sys_id=h["sys_id"],
                name=h.get("name", ""),
                class_label=h.get("class_label", ""),
                environment=h.get("environment", ""),
                operational_status=h.get("operational_status", 1),
                ip_address=h.get("ip_address", ""),
                short_description=h.get("short_description", ""),
                highlight=h.get("_formatted", {}),
            )
            for h in result.hits
        ]

        elapsed_ms = (time.monotonic() - t0) * 1000
        response = SearchResponse(
            hits=hits,
            total=result.estimated_total_hits or len(hits),
            limit=limit,
            offset=offset,
            query_time_ms=round(elapsed_ms, 2),
            cached=False,
        )

        await self._cache.set_search(
            filter_hash,
            response.model_dump(mode="json"),
            settings.CACHE_SEARCH_TTL,
        )

        return response

    async def suggest(self, prefix: str, *, limit: int = 5) -> SuggestResponse:
        if not settings.MEILI_ENABLED:
            return await self._kuzu_suggest(prefix, limit=limit)

        t0 = time.monotonic()
        result = await self._meili.suggest(prefix, limit=limit)

        suggestions = [
            SuggestHit(
                text=h.get("name", ""),
                ci_id=h["sys_id"],
                class_label=h.get("class_label", ""),
            )
            for h in result.hits
        ]

        elapsed_ms = (time.monotonic() - t0) * 1000
        return SuggestResponse(
            suggestions=suggestions,
            query=prefix,
            query_time_ms=round(elapsed_ms, 2),
            cached=False,
        )

    @staticmethod
    def _build_filter(
        class_filter: list[str] | None,
        env_filter: list[str] | None,
        status_filter: list[int] | None,
    ) -> str | None:
        parts: list[str] = []
        if class_filter:
            values = " OR ".join(f'class_label = "{v}"' for v in class_filter)
            parts.append(f"({values})")
        if env_filter:
            values = " OR ".join(f'environment = "{v}"' for v in env_filter)
            parts.append(f"({values})")
        if status_filter:
            values = " OR ".join(f"operational_status = {v}" for v in status_filter)
            parts.append(f"({values})")
        return " AND ".join(parts) if parts else None

    # --- Kuzu-based fallback (used when Meilisearch is disabled) ---

    async def _kuzu_search(
        self,
        query: str,
        *,
        class_filter: list[str] | None = None,
        env_filter: list[str] | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> SearchResponse:
        t0 = time.monotonic()

        has_class = class_filter is not None and len(class_filter) > 0
        has_env = env_filter is not None and len(env_filter) > 0

        params: dict[str, Any] = {"query": query, "limit": limit, "offset": offset}

        if has_class and has_env:
            cypher = search_q.SEARCH_BY_NAME_WITH_BOTH
            params["classes"] = class_filter
            params["envs"] = env_filter
        elif has_class:
            cypher = search_q.SEARCH_BY_NAME_WITH_CLASS
            params["classes"] = class_filter
        elif has_env:
            cypher = search_q.SEARCH_BY_NAME_WITH_ENV
            params["envs"] = env_filter
        else:
            cypher = search_q.SEARCH_BY_NAME

        rows = await self._kuzu.read_query(cypher, params)

        count_rows = await self._kuzu.read_query(
            search_q.SEARCH_COUNT, {"query": query}
        )
        total = count_rows[0]["total"] if count_rows else len(rows)

        hits = [
            SearchHit(
                sys_id=r["sys_id"],
                name=r.get("name", ""),
                class_label=r.get("class_label", ""),
                environment=r.get("environment", ""),
                operational_status=r.get("operational_status", 1),
                ip_address=r.get("ip_address", ""),
                short_description=r.get("short_description", ""),
                highlight={},
            )
            for r in rows
        ]

        elapsed_ms = (time.monotonic() - t0) * 1000
        return SearchResponse(
            hits=hits,
            total=total,
            limit=limit,
            offset=offset,
            query_time_ms=round(elapsed_ms, 2),
            cached=False,
        )

    async def _kuzu_suggest(self, prefix: str, *, limit: int = 5) -> SuggestResponse:
        t0 = time.monotonic()

        rows = await self._kuzu.read_query(
            search_q.SUGGEST_BY_PREFIX, {"prefix": prefix, "limit": limit}
        )

        suggestions = [
            SuggestHit(
                text=r.get("name", ""),
                ci_id=r["sys_id"],
                class_label=r.get("class_label", ""),
            )
            for r in rows
        ]

        elapsed_ms = (time.monotonic() - t0) * 1000
        return SuggestResponse(
            suggestions=suggestions,
            query=prefix,
            query_time_ms=round(elapsed_ms, 2),
            cached=False,
        )
