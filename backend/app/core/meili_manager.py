from __future__ import annotations

from typing import Any

from meilisearch_python_sdk import AsyncClient
from meilisearch_python_sdk.models.search import SearchResults

from app.logging import get_logger

log = get_logger(__name__)

INDEX_NAME = "cmdb-cis"

_SEARCHABLE_ATTRIBUTES = [
    "name",
    "short_description",
    "class_label",
    "ip_address",
    "fqdn",
]
_FILTERABLE_ATTRIBUTES = [
    "class_label",
    "environment",
    "operational_status",
    "sys_class_name",
]
_SORTABLE_ATTRIBUTES = ["name", "sys_updated_on"]


class MeiliManager:
    def __init__(self, url: str, master_key: str) -> None:
        self._url = url
        self._master_key = master_key
        self._client: AsyncClient | None = None

    async def connect(self) -> None:
        self._client = AsyncClient(self._url, self._master_key)
        log.info("meili_manager.connected", url=self._url)

    @property
    def client(self) -> AsyncClient:
        if self._client is None:
            raise RuntimeError("MeiliManager not connected")
        return self._client

    async def bootstrap_index(self) -> None:
        try:
            await self.client.get_index(INDEX_NAME)
        except Exception:
            await self.client.create_index(INDEX_NAME, primary_key="sys_id")

        index = self.client.index(INDEX_NAME)
        await index.update_searchable_attributes(_SEARCHABLE_ATTRIBUTES)
        await index.update_filterable_attributes(_FILTERABLE_ATTRIBUTES)
        await index.update_sortable_attributes(_SORTABLE_ATTRIBUTES)
        await index.update_typo_tolerance(
            {
                "enabled": True,
                "minWordSizeForTypos": {"oneTypo": 4, "twoTypos": 8},
            }
        )
        log.info("meili_manager.index_bootstrapped", index=INDEX_NAME)

    async def search(
        self,
        query: str,
        *,
        filter_str: str | None = None,
        limit: int = 20,
        offset: int = 0,
        sort: list[str] | None = None,
    ) -> SearchResults:
        index = self.client.index(INDEX_NAME)
        return await index.search(
            query,
            filter=filter_str,
            limit=limit,
            offset=offset,
            sort=sort,
            show_ranking_score=False,
            attributes_to_highlight=["name", "short_description"],
        )

    async def suggest(self, prefix: str, *, limit: int = 5) -> SearchResults:
        index = self.client.index(INDEX_NAME)
        return await index.search(
            prefix,
            limit=limit,
            attributes_to_retrieve=["sys_id", "name", "class_label"],
        )

    async def batch_upsert(self, documents: list[dict[str, Any]]) -> None:
        index = self.client.index(INDEX_NAME)
        batch_size = 1000
        for i in range(0, len(documents), batch_size):
            batch = documents[i : i + batch_size]
            await index.add_documents(batch)
        log.info("meili_manager.batch_upsert", count=len(documents))

    async def get_stats(self) -> dict[str, Any]:
        index = self.client.index(INDEX_NAME)
        stats = await index.get_stats()
        return {
            "number_of_documents": stats.number_of_documents,
            "is_indexing": stats.is_indexing,
        }

    async def health_check(self) -> bool:
        try:
            return await self.client.is_healthy()
        except Exception:
            return False

    async def disconnect(self) -> None:
        if self._client:
            await self._client.aclose()
            log.info("meili_manager.disconnected")
