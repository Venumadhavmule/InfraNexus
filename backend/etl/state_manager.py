from __future__ import annotations

import asyncio
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from app.config import settings
from app.core.redis_manager import RedisManager
from app.logging import get_logger

log = get_logger(__name__)

_STATE_KEY = "etl:state"


class ETLStateManager:
    def __init__(self, redis: RedisManager, state_path: str) -> None:
        self._redis = redis
        self._state_path = Path(state_path)
        self._file_lock = asyncio.Lock()
        self._use_redis = settings.REDIS_ENABLED
        self._state_path.parent.mkdir(parents=True, exist_ok=True)

    async def get_state(self) -> dict[str, Any]:
        if self._use_redis:
            raw = await self._redis.get(_STATE_KEY)
            if raw is None:
                return {"status": "idle"}
            return RedisManager.deserialize(raw)

        async with self._file_lock:
            if not self._state_path.exists():
                return {"status": "idle"}

            try:
                return json.loads(self._state_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                log.warning("etl_state.file_corrupt", path=str(self._state_path))
                return {"status": "idle"}

    async def set_running(self, sync_id: str, sync_type: str) -> None:
        state = await self.get_state()
        if state.get("status") == "running":
            raise RuntimeError(f"ETL already running: {state.get('sync_id')}")

        next_scheduled_sync = state.get("next_scheduled_sync")
        new_state = {
            **state,
            "status": "running",
            "sync_id": sync_id,
            "sync_type": sync_type,
            "started_at": datetime.utcnow().isoformat(),
            "current_stage": None,
            "current_stage_started_at": None,
            "next_scheduled_sync": next_scheduled_sync,
        }
        await self._save_state(new_state)
        log.info("etl_state.running", sync_id=sync_id, sync_type=sync_type)

    async def set_stage(self, sync_id: str, stage: str) -> None:
        state = await self.get_state()
        state.update({
            "sync_id": sync_id,
            "current_stage": stage,
            "current_stage_started_at": datetime.utcnow().isoformat(),
        })
        await self._save_state(state)
        log.info("etl_state.stage", sync_id=sync_id, stage=stage)

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
            "current_stage": None,
            "current_stage_started_at": None,
        })
        await self._save_state(state)
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
            "last_sync_type": state.get("sync_type"),
            "last_sync_error": error,
            "last_sync_timestamp": datetime.utcnow().isoformat(),
        })
        await self._save_state(state)
        log.error("etl_state.failed", sync_id=sync_id, error=error)

    async def get_last_sync_cursor(self) -> datetime | None:
        state = await self.get_state()
        ts = state.get("last_sync_timestamp")
        if ts:
            return datetime.fromisoformat(ts)
        return None

    async def recover_if_running(self) -> None:
        state = await self.get_state()
        if state.get("status") != "running":
            return

        sync_id = state.get("sync_id", "unknown")
        state.update({
            "status": "failed",
            "sync_id": None,
            "last_sync_error": "Previous ETL run was interrupted during shutdown or restart.",
            "last_sync_timestamp": datetime.utcnow().isoformat(),
        })
        await self._save_state(state)
        log.warning("etl_state.recovered_interrupted_run", sync_id=sync_id)

    async def set_next_scheduled_sync(self, next_run: datetime | None) -> None:
        state = await self.get_state()
        state["next_scheduled_sync"] = next_run.isoformat() if next_run else None
        await self._save_state(state)

    async def set_scheduler_interval(self, interval_minutes: int) -> None:
        next_run = datetime.utcnow() + timedelta(minutes=interval_minutes)
        await self.set_next_scheduled_sync(next_run)

    async def _save_state(self, state: dict[str, Any]) -> None:
        if self._use_redis:
            await self._redis.set(_STATE_KEY, RedisManager.serialize(state), ttl=0)
            return

        async with self._file_lock:
            self._state_path.write_text(json.dumps(state, indent=2), encoding="utf-8")
