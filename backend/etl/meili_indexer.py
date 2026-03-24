from __future__ import annotations

from typing import Any

from app.core.meili_manager import MeiliManager
from app.logging import get_logger

log = get_logger(__name__)


class MeiliIndexer:
    def __init__(self, meili: MeiliManager) -> None:
        self._meili = meili

    async def batch_index(self, documents: list[dict[str, Any]]) -> int:
        if not documents:
            return 0
        await self._meili.batch_upsert(documents)
        log.info("meili_indexer.indexed", count=len(documents))
        return len(documents)

    async def verify_count(self, expected: int) -> bool:
        stats = await self._meili.get_stats()
        actual = stats.get("number_of_documents", 0)
        ok = actual >= expected
        if not ok:
            log.warning(
                "meili_indexer.count_mismatch",
                expected=expected,
                actual=actual,
            )
        return ok
