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

_REL_CSV_COLUMNS = ["from", "to", "rel_type", "rel_type_reverse", "sys_id"]


class KuzuLoader:
    def __init__(self, kuzu: KuzuManager) -> None:
        self._kuzu = kuzu

    async def reset_for_full_sync(self) -> None:
        """Drop and recreate all tables before a full sync to ensure a clean state."""
        await self._kuzu.reset_schema()
        log.info("kuzu_loader.reset_complete")

    async def bulk_load_cis(self, cis: list[dict[str, Any]]) -> int:
        if not cis:
            return 0

        csv_path = self._write_ci_csv(cis)
        try:
            await self._kuzu.bulk_copy("CI", csv_path)
            log.info("kuzu_loader.bulk_cis", count=len(cis))
            # Track loaded sys_ids for relationship filtering
            self._loaded_ci_ids = {ci["sys_id"] for ci in cis if ci.get("sys_id")}
            return len(cis)
        finally:
            csv_path.unlink(missing_ok=True)

    async def bulk_load_relationships(self, rels: list[dict[str, Any]]) -> int:
        if not rels:
            return 0

        # Filter to only include relationships where both endpoints exist in loaded CIs
        known_ids = getattr(self, "_loaded_ci_ids", None)
        if known_ids is not None:
            valid_rels = [
                r for r in rels
                if r.get("parent_id") in known_ids and r.get("child_id") in known_ids
            ]
            if len(valid_rels) < len(rels):
                log.info(
                    "kuzu_loader.rels_filtered",
                    original=len(rels),
                    valid=len(valid_rels),
                )
            rels = valid_rels

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
    def _sanitize(value: Any) -> str:
        """Ensure value is a clean UTF-8 string safe for CSV (no newlines, no non-UTF-8)."""
        if value is None:
            return ""
        s = str(value)
        # Replace newlines/tabs that break Kuzu's parallel CSV reader
        s = s.replace("\r\n", " ").replace("\n", " ").replace("\r", " ").replace("\t", " ")
        return s.encode("utf-8", errors="replace").decode("utf-8")

    @staticmethod
    def _write_ci_csv(cis: list[dict[str, Any]]) -> Path:
        tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, newline="", encoding="utf-8",
        )
        path = Path(tmp.name)
        writer = csv.DictWriter(
            tmp, fieldnames=_CI_CSV_COLUMNS, extrasaction="ignore", quoting=csv.QUOTE_ALL
        )
        writer.writeheader()
        for ci in cis:
            ci.setdefault("degree", 0)
            ci.setdefault("cluster_id", -1)
            writer.writerow(
                {col: KuzuLoader._sanitize(ci.get(col, "")) for col in _CI_CSV_COLUMNS}
            )
        tmp.close()
        return path

    @staticmethod
    def _write_rel_csv(rels: list[dict[str, Any]]) -> Path:
        tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, newline="", encoding="utf-8",
        )
        path = Path(tmp.name)
        writer = csv.DictWriter(
            tmp, fieldnames=_REL_CSV_COLUMNS, extrasaction="ignore", quoting=csv.QUOTE_ALL
        )
        writer.writeheader()
        for rel in rels:
            writer.writerow({
                "from": KuzuLoader._sanitize(rel.get("parent_id", "")),
                "to": KuzuLoader._sanitize(rel.get("child_id", "")),
                "rel_type": KuzuLoader._sanitize(rel.get("rel_type", "")),
                "rel_type_reverse": KuzuLoader._sanitize(rel.get("rel_type_reverse", "")),
                "sys_id": KuzuLoader._sanitize(rel.get("sys_id", "")),
            })
        tmp.close()
        return path
