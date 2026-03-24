from __future__ import annotations

import csv
import tempfile
from pathlib import Path
from typing import Any

from app.core.kuzu_manager import KuzuManager
from app.logging import get_logger
from app.queries.ci import UPDATE_DEGREE, UPSERT_CI, UPSERT_RELATIONSHIP

log = get_logger(__name__)

_CI_CSV_COLUMNS = [
    "sys_id", "name", "sys_class_name", "class_label", "environment",
    "operational_status", "ip_address", "fqdn", "os", "os_version",
    "cpu_count", "ram_mb", "disk_space_gb", "location", "department",
    "assigned_to", "support_group", "short_description",
    "sys_created_on", "sys_updated_on", "degree", "cluster_id",
]

_REL_CSV_COLUMNS = ["parent_id", "child_id", "rel_type", "rel_type_reverse", "sys_id"]


class KuzuLoader:
    def __init__(self, kuzu: KuzuManager) -> None:
        self._kuzu = kuzu

    async def bulk_load_cis(self, cis: list[dict[str, Any]]) -> int:
        if not cis:
            return 0

        csv_path = self._write_ci_csv(cis)
        try:
            await self._kuzu.bulk_copy("CI", csv_path)
            log.info("kuzu_loader.bulk_cis", count=len(cis))
            return len(cis)
        finally:
            csv_path.unlink(missing_ok=True)

    async def bulk_load_relationships(self, rels: list[dict[str, Any]]) -> int:
        if not rels:
            return 0

        csv_path = self._write_rel_csv(rels)
        try:
            await self._kuzu.bulk_copy("RELATES_TO", csv_path)
            log.info("kuzu_loader.bulk_rels", count=len(rels))
            return len(rels)
        finally:
            csv_path.unlink(missing_ok=True)

    async def upsert_ci(self, ci: dict[str, Any]) -> None:
        await self._kuzu.write_query(UPSERT_CI, ci)

    async def upsert_relationship(self, rel: dict[str, Any]) -> None:
        params = {
            "parent_id": rel["parent_id"],
            "child_id": rel["child_id"],
            "rel_sys_id": rel.get("sys_id", ""),
            "rel_type": rel["rel_type"],
            "rel_type_reverse": rel.get("rel_type_reverse", ""),
        }
        await self._kuzu.write_query(UPSERT_RELATIONSHIP, params)

    async def update_degree_counts(self) -> None:
        await self._kuzu.write_query(UPDATE_DEGREE)
        log.info("kuzu_loader.degrees_updated")

    @staticmethod
    def _write_ci_csv(cis: list[dict[str, Any]]) -> Path:
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, newline="")
        path = Path(tmp.name)
        writer = csv.DictWriter(
            tmp, fieldnames=_CI_CSV_COLUMNS, extrasaction="ignore", quoting=csv.QUOTE_ALL
        )
        writer.writeheader()
        for ci in cis:
            ci.setdefault("degree", 0)
            ci.setdefault("cluster_id", -1)
            writer.writerow({col: ci.get(col, "") for col in _CI_CSV_COLUMNS})
        tmp.close()
        return path

    @staticmethod
    def _write_rel_csv(rels: list[dict[str, Any]]) -> Path:
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, newline="")
        path = Path(tmp.name)
        writer = csv.DictWriter(
            tmp, fieldnames=_REL_CSV_COLUMNS, extrasaction="ignore", quoting=csv.QUOTE_ALL
        )
        writer.writeheader()
        for rel in rels:
            writer.writerow({col: rel.get(col, "") for col in _REL_CSV_COLUMNS})
        tmp.close()
        return path
