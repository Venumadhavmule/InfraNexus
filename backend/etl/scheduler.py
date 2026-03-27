from __future__ import annotations

import uuid

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.logging import get_logger
from etl.runner import ETLRunner
from etl.state_manager import ETLStateManager

log = get_logger(__name__)


class ETLScheduler:
    def __init__(
        self,
        runner: ETLRunner,
        state_mgr: ETLStateManager,
        interval_minutes: int,
    ) -> None:
        self._runner = runner
        self._state = state_mgr
        self._interval = interval_minutes
        self._scheduler = AsyncIOScheduler()

    async def start(self) -> None:
        self._scheduler.add_job(
            self._run_if_idle,
            "interval",
            minutes=self._interval,
            id="etl_incremental_sync",
            replace_existing=True,
        )
        self._scheduler.start()
        await self._state.set_scheduler_interval(self._interval)
        log.info("etl_scheduler.started", interval_minutes=self._interval)

    async def _run_if_idle(self) -> None:
        state = await self._state.get_state()
        if state.get("status") == "running":
            log.info("etl_scheduler.skipped_already_running")
            return

        sync_id = uuid.uuid4().hex[:12]
        await self._state.set_running(sync_id, "incremental")
        await self._runner.run_incremental_sync(sync_id)
        await self._state.set_scheduler_interval(self._interval)

    async def stop(self) -> None:
        self._scheduler.shutdown(wait=False)
        log.info("etl_scheduler.stopped")
