from __future__ import annotations

from datetime import datetime
from typing import Any

from app.core.redis_manager import RedisManager
from app.logging import get_logger

log = get_logger(__name__)

_STATE_KEY = "etl:state"


class ETLStateManager:
    def __init__(self, redis: RedisManager) -> None:
        self._redis = redis

    async def get_state(self) -> dict[str, Any]:
        raw = await self._redis.get(_STATE_KEY)
        if raw is None:
            return {"status": "idle"}
        return RedisManager.deserialize(raw)

    async def set_running(self, sync_id: str, sync_type: str) -> None:
        state = await self.get_state()
        if state.get("status") == "running":
            raise RuntimeError(f"ETL already running: {state.get('sync_id')}")

        new_state = {
            **state,
            "status": "running",
            "sync_id": sync_id,
            "sync_type": sync_type,
            "started_at": datetime.utcnow().isoformat(),
        }
        await self._redis.set(_STATE_KEY, RedisManager.serialize(new_state), ttl=0)
        log.info("etl_state.running", sync_id=sync_id, sync_type=sync_type)

    async def set_completed(
        self,
        sync_id: str,
        *,
        ci_count: int = 0,
        rel_count: int = 0,
        duration_seconds: float = 0.0,
    ) -> None:
        state = await self.get_state()
        state.update({
            "status": "idle",
            "sync_id": None,
            "last_sync_type": state.get("sync_type"),
            "last_sync_timestamp": datetime.utcnow().isoformat(),
            "last_sync_duration_seconds": round(duration_seconds, 2),
            "last_sync_ci_count": ci_count,
            "last_sync_rel_count": rel_count,
            "last_sync_error": None,
        })
        await self._redis.set(_STATE_KEY, RedisManager.serialize(state), ttl=0)
        log.info(
            "etl_state.completed",
            sync_id=sync_id,
            ci_count=ci_count,
            rel_count=rel_count,
            duration_seconds=round(duration_seconds, 2),
        )

    async def set_failed(self, sync_id: str, error: str) -> None:
        state = await self.get_state()
        state.update({
            "status": "failed",
            "sync_id": None,
            "last_sync_error": error,
            "last_sync_timestamp": datetime.utcnow().isoformat(),
        })
        await self._redis.set(_STATE_KEY, RedisManager.serialize(state), ttl=0)
        log.error("etl_state.failed", sync_id=sync_id, error=error)

    async def get_last_sync_cursor(self) -> datetime | None:
        state = await self.get_state()
        ts = state.get("last_sync_timestamp")
        if ts:
            return datetime.fromisoformat(ts)
        return None
