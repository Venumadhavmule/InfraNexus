from __future__ import annotations

from fastapi import Depends, Request

from app.core.kuzu_manager import KuzuManager
from app.core.meili_manager import MeiliManager
from app.core.redis_manager import RedisManager
from app.core.ws_manager import ConnectionManager
from app.services.cache_service import CacheService
from app.services.ci_service import CIService
from app.services.graph_service import GraphService
from app.services.search_service import SearchService


def get_kuzu(request: Request) -> KuzuManager:
    return request.app.state.kuzu


def get_redis(request: Request) -> RedisManager:
    return request.app.state.redis


def get_meili(request: Request) -> MeiliManager:
    return request.app.state.meili


def get_ws_manager(request: Request) -> ConnectionManager:
    return request.app.state.ws_manager


def get_cache_service(redis: RedisManager = Depends(get_redis)) -> CacheService:
    return CacheService(redis)


def get_graph_service(
    kuzu: KuzuManager = Depends(get_kuzu),
    cache: CacheService = Depends(get_cache_service),
) -> GraphService:
    return GraphService(kuzu, cache)


def get_ci_service(
    kuzu: KuzuManager = Depends(get_kuzu),
    cache: CacheService = Depends(get_cache_service),
) -> CIService:
    return CIService(kuzu, cache)


def get_search_service(
    meili: MeiliManager = Depends(get_meili),
    kuzu: KuzuManager = Depends(get_kuzu),
    cache: CacheService = Depends(get_cache_service),
) -> SearchService:
    return SearchService(meili, kuzu, cache)


def get_etl_state_manager(request: Request) -> object:
    return request.app.state.etl_state_manager


def get_etl_runner(request: Request) -> object:
    return request.app.state.etl_runner
