from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

import kuzu

from app.logging import get_logger

log = get_logger(__name__)

_CI_TABLE_DDL = """
CREATE NODE TABLE IF NOT EXISTS CI(
    sys_id STRING,
    name STRING,
    sys_class_name STRING,
    class_label STRING,
    environment STRING,
    operational_status INT64,
    ip_address STRING,
    fqdn STRING,
    os STRING,
    os_version STRING,
    cpu_count INT64,
    ram_mb INT64,
    disk_space_gb DOUBLE,
    location STRING,
    department STRING,
    assigned_to STRING,
    support_group STRING,
    short_description STRING,
    sys_created_on TIMESTAMP,
    sys_updated_on TIMESTAMP,
    degree INT64 DEFAULT 0,
    cluster_id INT64 DEFAULT -1,
    PRIMARY KEY (sys_id)
)
"""

_REL_TABLE_DDL = """
CREATE REL TABLE IF NOT EXISTS RELATES_TO(
    FROM CI TO CI,
    rel_type STRING,
    rel_type_reverse STRING,
    sys_id STRING
)
"""


class KuzuManager:
    def __init__(self, db_path: str) -> None:
        self._db_path = Path(db_path)
        self._db_path.mkdir(parents=True, exist_ok=True)
        self._db = kuzu.Database(str(self._db_path))
        self._write_lock = asyncio.Lock()
        self._reader_pool: asyncio.Queue[kuzu.Connection] = asyncio.Queue(maxsize=4)
        for _ in range(4):
            self._reader_pool.put_nowait(kuzu.Connection(self._db))
        self._writer = kuzu.Connection(self._db)
        log.info("kuzu_manager.initialized", db_path=str(self._db_path))

    async def bootstrap_schema(self) -> None:
        async with self._write_lock:
            self._writer.execute(_CI_TABLE_DDL)
            self._writer.execute(_REL_TABLE_DDL)
        log.info("kuzu_manager.schema_bootstrapped")

    async def read_query(self, cypher: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        conn = await self._reader_pool.get()
        try:
            result = await asyncio.to_thread(self._execute, conn, cypher, params or {})
            return result
        finally:
            await self._reader_pool.put(conn)

    async def write_query(self, cypher: str, params: dict[str, Any] | None = None) -> None:
        async with self._write_lock:
            await asyncio.to_thread(self._execute, self._writer, cypher, params or {})

    async def bulk_copy(self, table: str, csv_path: Path) -> None:
        cypher = f'COPY {table} FROM "{csv_path.as_posix()}"'
        async with self._write_lock:
            await asyncio.to_thread(self._writer.execute, cypher)
        log.info("kuzu_manager.bulk_copy_complete", table=table, path=str(csv_path))

    def _execute(
        self, conn: kuzu.Connection, cypher: str, params: dict[str, Any]
    ) -> list[dict[str, Any]]:
        result = conn.execute(cypher, params)
        rows: list[dict[str, Any]] = []
        while result.has_next():
            rows.append(dict(zip(result.get_column_names(), result.get_next())))
        return rows

    async def close(self) -> None:
        while not self._reader_pool.empty():
            conn = self._reader_pool.get_nowait()
            conn.close()
        self._writer.close()
        log.info("kuzu_manager.closed")
