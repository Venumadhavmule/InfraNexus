from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from datetime import datetime
from typing import Any

import httpx

from app.exceptions import SnowAuthError, SnowRateLimitError, SnowTimeoutError
from app.logging import get_logger

log = get_logger(__name__)

_CI_FIELDS = [
    "sys_id", "name", "sys_class_name", "sys_created_on", "sys_updated_on",
    "operational_status", "ip_address", "fqdn", "os", "os_version",
    "cpu_count", "ram", "disk_space", "location", "department",
    "assigned_to", "support_group", "short_description",
]

_REL_FIELDS = [
    "sys_id", "parent", "child", "type",
]

_REL_TYPE_FIELDS = [
    "sys_id", "name", "parent_descriptor", "child_descriptor",
]

_RATE_INTERVAL = 1 / 1.4  # ~714ms between requests
_PAGE_SIZE = 1000
_MAX_RETRIES = 7
_BACKOFF_BASE = 1.0
_BACKOFF_MAX = 60.0


class SnowClient:
    def __init__(self, instance: str, username: str, password: str) -> None:
        self._instance = instance.rstrip("/")
        self._auth = (username, password) if username and password else None
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self._instance,
                auth=self._auth,
                timeout=httpx.Timeout(30.0, connect=10.0),
                headers={"Accept": "application/json"},
            )
        return self._client

    async def fetch_cis(self, since: datetime | None = None) -> AsyncIterator[list[dict[str, Any]]]:
        query = f"sys_updated_on>{since.strftime('%Y-%m-%d %H:%M:%S')}" if since else ""
        async for page in self._paginate("cmdb_ci", query, _CI_FIELDS):
            yield page

    async def fetch_relationships(
        self, since: datetime | None = None
    ) -> AsyncIterator[list[dict[str, Any]]]:
        query = f"sys_updated_on>{since.strftime('%Y-%m-%d %H:%M:%S')}" if since else ""
        async for page in self._paginate("cmdb_rel_ci", query, _REL_FIELDS):
            yield page

    async def fetch_rel_types(self) -> list[dict[str, Any]]:
        all_types: list[dict[str, Any]] = []
        async for page in self._paginate("cmdb_rel_type", "", _REL_TYPE_FIELDS):
            all_types.extend(page)
        return all_types

    async def _paginate(
        self, table: str, query: str, fields: list[str]
    ) -> AsyncIterator[list[dict[str, Any]]]:
        offset = 0
        while True:
            params: dict[str, str | int] = {
                "sysparm_limit": _PAGE_SIZE,
                "sysparm_offset": offset,
                "sysparm_fields": ",".join(fields),
            }
            if query:
                params["sysparm_query"] = query

            url = f"/api/now/table/{table}"
            data = await self._request(url, params)
            records = data.get("result", [])
            if not records:
                break

            yield records
            offset += len(records)

            if len(records) < _PAGE_SIZE:
                break

            await asyncio.sleep(_RATE_INTERVAL)

    async def _request(self, url: str, params: dict[str, Any]) -> dict[str, Any]:
        client = await self._get_client()

        for attempt in range(_MAX_RETRIES):
            try:
                response = await client.get(url, params=params)

                if response.status_code == 200:
                    return response.json()

                if response.status_code == 401:
                    raise SnowAuthError()

                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", "60"))
                    if attempt == _MAX_RETRIES - 1:
                        raise SnowRateLimitError(retry_after)
                    log.warning("snow.rate_limited", retry_after=retry_after, attempt=attempt)
                    await asyncio.sleep(retry_after)
                    continue

                if response.status_code >= 500:
                    backoff = min(_BACKOFF_BASE * (2**attempt), _BACKOFF_MAX)
                    log.warning(
                        "snow.server_error",
                        status=response.status_code,
                        attempt=attempt,
                        backoff=backoff,
                    )
                    await asyncio.sleep(backoff)
                    continue

                response.raise_for_status()

            except httpx.TimeoutException:
                if attempt == _MAX_RETRIES - 1:
                    raise SnowTimeoutError()
                backoff = min(_BACKOFF_BASE * (2**attempt), _BACKOFF_MAX)
                log.warning("snow.timeout", attempt=attempt, backoff=backoff)
                await asyncio.sleep(backoff)

        raise SnowTimeoutError()

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
