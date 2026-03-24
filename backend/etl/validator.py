from __future__ import annotations

import re
from typing import Any

from app.logging import get_logger

log = get_logger(__name__)

_SYS_ID_PATTERN = re.compile(r"^[a-f0-9]{32}$")


class CIValidator:
    @staticmethod
    def validate(ci: dict[str, Any]) -> tuple[bool, list[str]]:
        errors: list[str] = []

        sys_id = ci.get("sys_id", "")
        if not sys_id or not _SYS_ID_PATTERN.match(sys_id):
            errors.append(f"Invalid sys_id: '{sys_id}'")

        if not ci.get("name"):
            errors.append("Missing required field: name")

        if not ci.get("sys_class_name"):
            errors.append("Missing required field: sys_class_name")

        op_status = ci.get("operational_status")
        if op_status is not None:
            try:
                val = int(op_status)
                if val < 1 or val > 6:
                    errors.append(f"operational_status out of range: {val}")
            except (ValueError, TypeError):
                errors.append(f"Invalid operational_status: {op_status}")

        return (len(errors) == 0, errors)


class RelationshipValidator:
    @staticmethod
    def validate(rel: dict[str, Any]) -> tuple[bool, list[str]]:
        errors: list[str] = []

        parent_id = rel.get("parent_id", "")
        if not parent_id or not _SYS_ID_PATTERN.match(parent_id):
            errors.append(f"Invalid parent sys_id: '{parent_id}'")

        child_id = rel.get("child_id", "")
        if not child_id or not _SYS_ID_PATTERN.match(child_id):
            errors.append(f"Invalid child sys_id: '{child_id}'")

        if parent_id and child_id and parent_id == child_id:
            errors.append(f"Self-loop detected: {parent_id}")

        if not rel.get("rel_type"):
            errors.append("Missing required field: rel_type")

        return (len(errors) == 0, errors)
