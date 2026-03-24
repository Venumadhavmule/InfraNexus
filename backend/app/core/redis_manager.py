from __future__ import annotations

import time
from typing import Any

import msgpack
import redis.asyncio as aioredis

from app.logging import get_logger

log = get_logger(__name__)


class RedisManager:
    def __init__(self, url: str) -> None:
        self._url = url
        self._client: aioredis.Redis | None = None

    async def connect(self) -> None:
        self._client = aioredis.from_url(
            self._url,
            decode_responses=False,
            max_connections=20,
        )
        await self._client.ping()
        log.info("redis_manager.connected", url=self._url)

    @property
    def client(self) -> aioredis.Redis:
        if self._client is None:
            raise RuntimeError("RedisManager not connected")
        return self._client

    async def get(self, key: str) -> bytes | None:
        return await self.client.get(key)

    async def set(self, key: str, value: bytes, ttl: int) -> None:
        await self.client.set(key, value, ex=ttl)

    async def delete(self, key: str) -> None:
        await self.client.delete(key)

    async def delete_pattern(self, pattern: str) -> int:
        deleted = 0
        async for key in self.client.scan_iter(match=pattern, count=200):
            await self.client.delete(key)
            deleted += 1
        return deleted

    async def sliding_window_check(self, key: str, window: int, limit: int) -> bool:
        now = time.time()
        window_start = now - window
        pipe = self.client.pipeline(transaction=True)
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, window)
        results = await pipe.execute()
        current_count: int = results[1]
        return current_count < limit

    async def health_check(self) -> bool:
        try:
            return await self.client.ping()
        except Exception:
            return False

    async def disconnect(self) -> None:
        if self._client:
            await self._client.aclose()
            log.info("redis_manager.disconnected")

    @staticmethod
    def serialize(data: Any) -> bytes:
        return msgpack.packb(data, use_bin_type=True)

    @staticmethod
    def deserialize(raw: bytes) -> Any:
        return msgpack.unpackb(raw, raw=False)
