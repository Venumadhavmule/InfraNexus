from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_ci_service
from app.models.base import SysId
from app.models.ci import CIDetail, CITimelineResponse
from app.services.ci_service import CIService

router = APIRouter(prefix="/api/ci", tags=["ci"])


@router.get(
    "/{ci_id}",
    response_model=CIDetail,
    summary="Get full CI detail",
)
async def get_ci_detail(
    ci_id: SysId,
    ci_svc: Annotated[CIService, Depends(get_ci_service)],
) -> CIDetail:
    return await ci_svc.get_detail(ci_id)


@router.get(
    "/{ci_id}/timeline",
    response_model=CITimelineResponse,
    summary="Get CI change timeline",
)
async def get_ci_timeline(
    ci_id: SysId,
    ci_svc: Annotated[CIService, Depends(get_ci_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CITimelineResponse:
    return await ci_svc.get_timeline(ci_id, limit=limit, offset=offset)
