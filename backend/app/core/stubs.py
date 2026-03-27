"""
Stub (no-op) implementations of core managers.

Used when external services (Kuzu, Redis, Meilisearch) are disabled via config.
All methods return empty/default results so the application can start and serve
API responses without real service connections.

See references/DISABLED_FEATURES.md for details on re-enabling.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from app.logging import get_logger

log = get_logger(__name__)


class StubKuzuManager:
    """No-op Kuzu manager that returns empty results for all queries."""

    def __init__(self, db_path: str = "") -> None:
        log.info("stub_kuzu.initialized", note="Kuzu is DISABLED - returning empty results")

    async def bootstrap_schema(self) -> None:
        log.info("stub_kuzu.schema_skipped")

    async def read_query(
        self, cypher: str, params: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        return []

    async def write_query(
        self, cypher: str, params: dict[str, Any] | None = None
    ) -> None:
        pass

    async def bulk_copy(self, table: str, csv_path: Path) -> None:
        pass

    async def has_ci_data(self) -> bool:
        return False

    async def close(self) -> None:
        log.info("stub_kuzu.closed")


class StubRedisManager:
    """No-op Redis manager that always misses cache and allows all rate limits."""

    def __init__(self, url: str = "") -> None:
        log.info("stub_redis.initialized", note="Redis is DISABLED - no caching")

    async def connect(self) -> None:
        log.info("stub_redis.connect_skipped")

    async def get(self, key: str) -> bytes | None:
        return None

    async def set(self, key: str, value: bytes, ttl: int) -> None:
        pass

    async def delete(self, key: str) -> None:
        pass

    async def delete_pattern(self, pattern: str) -> int:
        return 0

    async def sliding_window_check(self, key: str, window: int, limit: int) -> bool:
        return True  # Always allow

    async def health_check(self) -> bool:
        return False

    async def disconnect(self) -> None:
        log.info("stub_redis.disconnected")

    @staticmethod
    def serialize(data: Any) -> bytes:
        return b""

    @staticmethod
    def deserialize(raw: bytes) -> Any:
        return {}


class StubMeiliManager:
    """No-op Meilisearch manager that returns empty search results."""

    def __init__(self, url: str = "", master_key: str = "") -> None:
        log.info("stub_meili.initialized", note="Meilisearch is DISABLED - search unavailable")

    async def connect(self) -> None:
        log.info("stub_meili.connect_skipped")

    async def bootstrap_index(self) -> None:
        log.info("stub_meili.index_skipped")

    async def search(
        self,
        query: str,
        *,
        filter_str: str | None = None,
        limit: int = 20,
        offset: int = 0,
        sort: list[str] | None = None,
    ) -> Any:
        return _StubSearchResults()

    async def suggest(self, prefix: str, *, limit: int = 5) -> Any:
        return _StubSearchResults()

    async def batch_upsert(self, documents: list[dict[str, Any]]) -> None:
        pass

    async def get_stats(self) -> dict[str, Any]:
        return {"number_of_documents": 0, "is_indexing": False}

    async def health_check(self) -> bool:
        return False

    async def disconnect(self) -> None:
        log.info("stub_meili.disconnected")


class _StubSearchResults:
    """Mimics meilisearch_python_sdk SearchResults with empty results."""

    hits: list[dict[str, Any]] = []
    estimated_total_hits: int = 0
