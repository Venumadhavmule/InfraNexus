from __future__ import annotations

import time

from app.config import settings
from app.core.kuzu_manager import KuzuManager
from app.exceptions import CINotFoundError
from app.logging import get_logger
from app.models.ci import CIDetail, CITimelineResponse, RelationshipSummary
from app.queries import ci as ci_q
from app.services.cache_service import CacheService

log = get_logger(__name__)


class CIService:
    def __init__(self, kuzu: KuzuManager, cache: CacheService) -> None:
        self._kuzu = kuzu
        self._cache = cache

    async def get_detail(self, ci_id: str) -> CIDetail:
        cached = await self._cache.get_ci(ci_id)
        if cached is not None:
            return CIDetail(**cached)

        t0 = time.monotonic()

        rows = await self._kuzu.read_query(ci_q.CI_BY_ID, {"ci_id": ci_id})
        if not rows:
            raise CINotFoundError(ci_id)

        incoming_rows = await self._kuzu.read_query(
            ci_q.CI_INCOMING_RELATIONSHIPS, {"ci_id": ci_id}
        )
        outgoing_rows = await self._kuzu.read_query(
            ci_q.CI_OUTGOING_RELATIONSHIPS, {"ci_id": ci_id}
        )

        ci_data = rows[0]
        ci_data["relationships_incoming"] = [
            RelationshipSummary(**r).model_dump() for r in incoming_rows
        ]
        ci_data["relationships_outgoing"] = [
            RelationshipSummary(**r).model_dump() for r in outgoing_rows
        ]

        detail = CIDetail(**ci_data)
        await self._cache.set_ci(
            ci_id,
            detail.model_dump(mode="json"),
            settings.CACHE_CI_TTL,
        )

        elapsed_ms = (time.monotonic() - t0) * 1000
        log.info("ci_service.get_detail", ci_id=ci_id, duration_ms=round(elapsed_ms, 2))
        return detail

    async def get_timeline(
        self,
        ci_id: str,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> CITimelineResponse:
        exists = await self._kuzu.read_query(ci_q.CI_EXISTS, {"ci_id": ci_id})
        if not exists or exists[0].get("cnt", 0) == 0:
            raise CINotFoundError(ci_id)

        # Timeline is a placeholder - ServiceNow audit history not yet loaded
        return CITimelineResponse(
            ci_id=ci_id,
            changes=[],
            total_changes=0,
            query_time_ms=0.0,
            cached=False,
        )
