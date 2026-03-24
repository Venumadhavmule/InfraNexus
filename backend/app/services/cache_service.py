from __future__ import annotations

import hashlib
from typing import Any

from app.core.redis_manager import RedisManager
from app.logging import get_logger

log = get_logger(__name__)


class CacheService:
    def __init__(self, redis: RedisManager) -> None:
        self._redis = redis

    # --- Key builders ---

    @staticmethod
    def _neighborhood_key(ci_id: str, hops: int, filter_hash: str) -> str:
        return f"nb:{ci_id}:{hops}:{filter_hash}"

    @staticmethod
    def _ci_key(ci_id: str) -> str:
        return f"ci:{ci_id}"

    @staticmethod
    def _search_key(query_hash: str) -> str:
        return f"search:{query_hash}"

    @staticmethod
    def hash_filters(**kwargs: Any) -> str:
        raw = "|".join(f"{k}={v}" for k, v in sorted(kwargs.items()) if v is not None)
        return hashlib.sha256(raw.encode()).hexdigest()[:12]

    # --- Neighborhood ---

    async def get_neighborhood(self, ci_id: str, hops: int, filter_hash: str) -> dict[str, Any] | None:
        key = self._neighborhood_key(ci_id, hops, filter_hash)
        raw = await self._redis.get(key)
        if raw is None:
            return None
        log.debug("cache.hit", key=key)
        return RedisManager.deserialize(raw)

    async def set_neighborhood(
        self, ci_id: str, hops: int, filter_hash: str, data: dict[str, Any], ttl: int
    ) -> None:
        key = self._neighborhood_key(ci_id, hops, filter_hash)
        await self._redis.set(key, RedisManager.serialize(data), ttl)

    # --- CI Detail ---

    async def get_ci(self, ci_id: str) -> dict[str, Any] | None:
        raw = await self._redis.get(self._ci_key(ci_id))
        if raw is None:
            return None
        log.debug("cache.hit", key=self._ci_key(ci_id))
        return RedisManager.deserialize(raw)

    async def set_ci(self, ci_id: str, data: dict[str, Any], ttl: int) -> None:
        await self._redis.set(self._ci_key(ci_id), RedisManager.serialize(data), ttl)

    # --- Search ---

    async def get_search(self, query_hash: str) -> dict[str, Any] | None:
        raw = await self._redis.get(self._search_key(query_hash))
        if raw is None:
            return None
        log.debug("cache.hit", key=self._search_key(query_hash))
        return RedisManager.deserialize(raw)

    async def set_search(self, query_hash: str, data: dict[str, Any], ttl: int) -> None:
        await self._redis.set(self._search_key(query_hash), RedisManager.serialize(data), ttl)

    # --- Invalidation ---

    async def invalidate_ci(self, ci_id: str) -> None:
        await self._redis.delete(self._ci_key(ci_id))
        deleted = await self._redis.delete_pattern(f"nb:{ci_id}:*")
        log.info("cache.invalidate_ci", ci_id=ci_id, neighborhood_keys_deleted=deleted)

    async def invalidate_search(self) -> None:
        deleted = await self._redis.delete_pattern("search:*")
        log.info("cache.invalidate_search", keys_deleted=deleted)

    async def invalidate_all(self) -> None:
        for pattern in ("nb:*", "ci:*", "search:*"):
            await self._redis.delete_pattern(pattern)
        log.info("cache.invalidate_all")
