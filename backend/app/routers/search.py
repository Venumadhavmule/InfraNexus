from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_search_service
from app.models.search import SearchResponse, SuggestResponse
from app.services.search_service import SearchService

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get(
    "",
    response_model=SearchResponse,
    summary="Full-text search for CIs",
)
async def search(
    q: Annotated[str, Query(min_length=1, max_length=255)],
    search_svc: Annotated[SearchService, Depends(get_search_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0, le=10000)] = 0,
    class_filter: Annotated[list[str] | None, Query(alias="class")] = None,
    env_filter: Annotated[list[str] | None, Query(alias="env")] = None,
    status_filter: Annotated[list[int] | None, Query(alias="status")] = None,
    sort: Annotated[str | None, Query()] = None,
) -> SearchResponse:
    return await search_svc.search(
        q,
        class_filter=class_filter,
        env_filter=env_filter,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
        sort=sort,
    )


@router.get(
    "/suggest",
    response_model=SuggestResponse,
    summary="Autocomplete suggestions",
)
async def suggest(
    q: Annotated[str, Query(min_length=2, max_length=50)],
    search_svc: Annotated[SearchService, Depends(get_search_service)],
    limit: Annotated[int, Query(ge=1, le=10)] = 5,
) -> SuggestResponse:
    return await search_svc.suggest(q, limit=limit)
