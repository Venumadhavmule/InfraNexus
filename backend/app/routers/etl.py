from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_etl_runner, get_etl_state_manager
from app.exceptions import ETLAlreadyRunningError
from app.models.etl import (
    ETLLogsResponse,
    ETLStatusResponse,
    SyncRequest,
    SyncStatus,
    SyncTriggerResponse,
)

router = APIRouter(prefix="/api/etl", tags=["etl"])


@router.post(
    "/sync",
    response_model=SyncTriggerResponse,
    status_code=202,
    summary="Trigger ETL sync",
)
async def trigger_sync(
    body: SyncRequest,
    state_mgr: Annotated[object, Depends(get_etl_state_manager)],
    runner: Annotated[object, Depends(get_etl_runner)],
) -> SyncTriggerResponse:
    from etl.state_manager import ETLStateManager
    from etl.runner import ETLRunner

    assert isinstance(state_mgr, ETLStateManager)
    assert isinstance(runner, ETLRunner)

    state = await state_mgr.get_state()
    if state.get("status") == SyncStatus.running.value:
        raise ETLAlreadyRunningError(state.get("sync_id", "unknown"))

    sync_id = uuid.uuid4().hex[:12]
    await state_mgr.set_running(sync_id, body.type.value)

    import asyncio
    if body.type.value == "full":
        asyncio.create_task(runner.run_full_sync(sync_id))
    else:
        asyncio.create_task(runner.run_incremental_sync(sync_id))

    return SyncTriggerResponse(
        sync_id=sync_id,
        type=body.type,
        status=SyncStatus.running,
        started_at=datetime.utcnow(),
    )


@router.get(
    "/status",
    response_model=ETLStatusResponse,
    summary="Get current ETL status",
)
async def get_status(
    state_mgr: Annotated[object, Depends(get_etl_state_manager)],
) -> ETLStatusResponse:
    from etl.state_manager import ETLStateManager
    assert isinstance(state_mgr, ETLStateManager)

    state = await state_mgr.get_state()
    return ETLStatusResponse(
        status=SyncStatus(state.get("status", "idle")),
        last_sync_type=state.get("last_sync_type"),
        last_sync_timestamp=state.get("last_sync_timestamp"),
        last_sync_duration_seconds=state.get("last_sync_duration_seconds"),
        last_sync_ci_count=state.get("last_sync_ci_count"),
        last_sync_rel_count=state.get("last_sync_rel_count"),
        last_sync_error=state.get("last_sync_error"),
        next_scheduled_sync=state.get("next_scheduled_sync"),
    )


@router.get(
    "/logs",
    response_model=ETLLogsResponse,
    summary="Get recent ETL logs",
)
async def get_logs(
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    level: Annotated[str | None, Query()] = None,
) -> ETLLogsResponse:
    # ETL logs are served from structlog ring buffer (future implementation)
    return ETLLogsResponse(logs=[], total=0)
