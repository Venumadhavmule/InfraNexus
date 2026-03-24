from __future__ import annotations

import time
from typing import Any

from app.core.kuzu_manager import KuzuManager
from app.core.meili_manager import MeiliManager
from app.core.redis_manager import RedisManager
from app.core.ws_manager import ConnectionManager
from app.logging import get_logger
from app.services.cache_service import CacheService
from etl.kuzu_loader import KuzuLoader
from etl.meili_indexer import MeiliIndexer
from etl.snow_client import SnowClient
from etl.state_manager import ETLStateManager
from etl.transformer import CITransformer, RelationshipTransformer
from etl.validator import CIValidator, RelationshipValidator

log = get_logger(__name__)


class ETLRunner:
    def __init__(
        self,
        *,
        snow: SnowClient,
        kuzu: KuzuManager,
        meili: MeiliManager,
        redis: RedisManager,
        state_mgr: ETLStateManager,
        ws_manager: ConnectionManager,
    ) -> None:
        self._snow = snow
        self._kuzu = kuzu
        self._loader = KuzuLoader(kuzu)
        self._indexer = MeiliIndexer(meili)
        self._state = state_mgr
        self._cache = CacheService(redis)
        self._ws = ws_manager

    async def run_full_sync(self, sync_id: str) -> None:
        t0 = time.monotonic()
        ci_count = 0
        rel_count = 0

        try:
            await self._broadcast("sync_started", {"sync_id": sync_id, "type": "full"})

            # 1. Fetch relationship types
            await self._broadcast("sync_progress", {"stage": "fetching_rel_types"})
            rel_types = await self._snow.fetch_rel_types()
            type_map = {rt["sys_id"]: rt for rt in rel_types}
            log.info("etl.rel_types_loaded", count=len(type_map))

            # 2. Fetch and load all CIs
            await self._broadcast("sync_progress", {"stage": "fetching_cis"})
            all_cis: list[dict[str, Any]] = []
            search_docs: list[dict[str, Any]] = []

            async for page in self._snow.fetch_cis():
                for raw in page:
                    transformed = CITransformer.transform(raw)
                    valid, errors = CIValidator.validate(transformed)
                    if valid:
                        all_cis.append(transformed)
                        search_docs.append(transformed)
                    else:
                        log.warning("etl.ci_rejected", sys_id=raw.get("sys_id"), errors=errors)

            await self._broadcast("sync_progress", {"stage": "loading_cis", "count": len(all_cis)})
            ci_count = await self._loader.bulk_load_cis(all_cis)

            # 3. Fetch and load all relationships
            await self._broadcast("sync_progress", {"stage": "fetching_relationships"})
            all_rels: list[dict[str, Any]] = []

            async for page in self._snow.fetch_relationships():
                for raw in page:
                    transformed = RelationshipTransformer.transform(raw, type_map)
                    valid, errors = RelationshipValidator.validate(transformed)
                    if valid:
                        all_rels.append(transformed)
                    else:
                        log.warning("etl.rel_rejected", errors=errors)

            await self._broadcast("sync_progress", {"stage": "loading_relationships", "count": len(all_rels)})
            rel_count = await self._loader.bulk_load_relationships(all_rels)

            # 4. Update degree counts
            await self._broadcast("sync_progress", {"stage": "updating_degrees"})
            await self._loader.update_degree_counts()

            # 5. Index in Meilisearch
            await self._broadcast("sync_progress", {"stage": "indexing_search"})
            await self._indexer.batch_index(search_docs)

            # 6. Invalidate all caches
            await self._cache.invalidate_all()

            duration = time.monotonic() - t0
            await self._state.set_completed(
                sync_id, ci_count=ci_count, rel_count=rel_count, duration_seconds=duration
            )
            await self._broadcast("sync_completed", {
                "sync_id": sync_id,
                "ci_count": ci_count,
                "rel_count": rel_count,
                "duration_seconds": round(duration, 2),
            })

        except Exception as e:
            log.exception("etl.full_sync_failed", sync_id=sync_id)
            await self._state.set_failed(sync_id, str(e))
            await self._broadcast("sync_error", {"sync_id": sync_id, "error": str(e)})

    async def run_incremental_sync(self, sync_id: str) -> None:
        t0 = time.monotonic()
        ci_count = 0
        rel_count = 0

        try:
            await self._broadcast("sync_started", {"sync_id": sync_id, "type": "incremental"})

            cursor = await self._state.get_last_sync_cursor()
            if cursor is None:
                log.info("etl.no_cursor_falling_back_to_full", sync_id=sync_id)
                await self.run_full_sync(sync_id)
                return

            # Fetch relationship type map
            rel_types = await self._snow.fetch_rel_types()
            type_map = {rt["sys_id"]: rt for rt in rel_types}

            # Fetch changed CIs
            await self._broadcast("sync_progress", {"stage": "fetching_changed_cis"})
            search_docs: list[dict[str, Any]] = []

            async for page in self._snow.fetch_cis(since=cursor):
                for raw in page:
                    transformed = CITransformer.transform(raw)
                    valid, errors = CIValidator.validate(transformed)
                    if valid:
                        await self._loader.upsert_ci(transformed)
                        search_docs.append(transformed)
                        await self._cache.invalidate_ci(transformed["sys_id"])
                        ci_count += 1
                    else:
                        log.warning("etl.ci_rejected", sys_id=raw.get("sys_id"), errors=errors)

            # Fetch changed relationships
            await self._broadcast("sync_progress", {"stage": "fetching_changed_relationships"})
            async for page in self._snow.fetch_relationships(since=cursor):
                for raw in page:
                    transformed = RelationshipTransformer.transform(raw, type_map)
                    valid, errors = RelationshipValidator.validate(transformed)
                    if valid:
                        await self._loader.upsert_relationship(transformed)
                        rel_count += 1
                    else:
                        log.warning("etl.rel_rejected", errors=errors)

            # Update degrees and index
            if ci_count > 0 or rel_count > 0:
                await self._loader.update_degree_counts()
                await self._indexer.batch_index(search_docs)
                await self._cache.invalidate_search()

            duration = time.monotonic() - t0
            await self._state.set_completed(
                sync_id, ci_count=ci_count, rel_count=rel_count, duration_seconds=duration
            )
            await self._broadcast("sync_completed", {
                "sync_id": sync_id,
                "ci_count": ci_count,
                "rel_count": rel_count,
                "duration_seconds": round(duration, 2),
            })

        except Exception as e:
            log.exception("etl.incremental_sync_failed", sync_id=sync_id)
            await self._state.set_failed(sync_id, str(e))
            await self._broadcast("sync_error", {"sync_id": sync_id, "error": str(e)})

    async def _broadcast(self, event_type: str, data: dict[str, Any]) -> None:
        await self._ws.broadcast({"type": event_type, **data})
