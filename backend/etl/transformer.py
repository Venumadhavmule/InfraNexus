from __future__ import annotations

from typing import Any

from app.logging import get_logger

log = get_logger(__name__)

# ServiceNow sys_class_name → canonical class label (13 categories)
CLASS_CATEGORIES: dict[str, str] = {
    # Servers
    "cmdb_ci_server": "Server",
    "cmdb_ci_win_server": "Server",
    "cmdb_ci_linux_server": "Server",
    "cmdb_ci_unix_server": "Server",
    "cmdb_ci_esx_server": "Server",
    # Virtual Machines
    "cmdb_ci_vm_instance": "Virtual Machine",
    "cmdb_ci_vmware_instance": "Virtual Machine",
    "cmdb_ci_hyper_v_instance": "Virtual Machine",
    # Databases
    "cmdb_ci_database": "Database",
    "cmdb_ci_db_instance": "Database",
    "cmdb_ci_db_ora_instance": "Database",
    "cmdb_ci_db_mssql_instance": "Database",
    "cmdb_ci_db_mysql_instance": "Database",
    "cmdb_ci_db_postgresql_instance": "Database",
    # Applications
    "cmdb_ci_appl": "Application",
    "cmdb_ci_app_server": "Application",
    "cmdb_ci_app_server_java": "Application",
    "cmdb_ci_app_server_tomcat": "Application",
    "cmdb_ci_app_server_websphere": "Application",
    # Services
    "cmdb_ci_service": "Service",
    "cmdb_ci_service_auto": "Service",
    "cmdb_ci_service_discovered": "Service",
    # Load Balancers
    "cmdb_ci_lb": "Load Balancer",
    "cmdb_ci_lb_f5_bigip": "Load Balancer",
    "cmdb_ci_lb_netscaler": "Load Balancer",
    # Network
    "cmdb_ci_netgear": "Network",
    "cmdb_ci_ip_router": "Network",
    "cmdb_ci_ip_switch": "Network",
    "cmdb_ci_ip_firewall": "Network",
    # Storage
    "cmdb_ci_storage_device": "Storage",
    "cmdb_ci_san": "Storage",
    "cmdb_ci_nas": "Storage",
    # Kubernetes
    "cmdb_ci_kubernetes_cluster": "Kubernetes",
    "cmdb_ci_kubernetes_node": "Kubernetes",
    # Containers
    "cmdb_ci_docker_container": "Container",
    "cmdb_ci_container": "Container",
    # Cloud
    "cmdb_ci_cloud_service_account": "Cloud",
    "cmdb_ci_cloud_subnet": "Cloud",
    # Endpoints
    "cmdb_ci_computer": "Endpoint",
    "cmdb_ci_pc_hardware": "Endpoint",
}

_ENV_NORMALIZATION: dict[str, str] = {
    "production": "Production",
    "prod": "Production",
    "prd": "Production",
    "staging": "Staging",
    "stage": "Staging",
    "stg": "Staging",
    "development": "Development",
    "dev": "Development",
    "test": "Test",
    "testing": "Test",
    "tst": "Test",
    "qa": "QA",
    "uat": "UAT",
    "dr": "DR",
    "disaster recovery": "DR",
}


class CITransformer:
    @staticmethod
    def transform(raw: dict[str, Any]) -> dict[str, Any]:
        sys_class = raw.get("sys_class_name", "")
        class_label = CLASS_CATEGORIES.get(sys_class, "Other")
        env_raw = raw.get("environment", "") or ""
        environment = _ENV_NORMALIZATION.get(env_raw.lower().strip(), env_raw or "Unknown")

        op_status_raw = raw.get("operational_status", "1")
        try:
            operational_status = int(op_status_raw) if op_status_raw else 1
        except (ValueError, TypeError):
            operational_status = 1

        cpu_raw = raw.get("cpu_count") or raw.get("cpu_count", None)
        ram_raw = raw.get("ram") or raw.get("ram_mb", None)
        disk_raw = raw.get("disk_space") or raw.get("disk_space_gb", None)

        return {
            "sys_id": raw["sys_id"],
            "name": raw.get("name", "") or "",
            "sys_class_name": sys_class,
            "class_label": class_label,
            "environment": environment,
            "operational_status": operational_status,
            "ip_address": raw.get("ip_address", "") or "",
            "fqdn": raw.get("fqdn", "") or "",
            "os": raw.get("os", "") or "",
            "os_version": raw.get("os_version", "") or "",
            "cpu_count": _safe_int(cpu_raw),
            "ram_mb": _safe_int(ram_raw),
            "disk_space_gb": _safe_float(disk_raw),
            "location": raw.get("location", "") or "",
            "department": raw.get("department", "") or "",
            "assigned_to": raw.get("assigned_to", "") or "",
            "support_group": raw.get("support_group", "") or "",
            "short_description": raw.get("short_description", "") or "",
            "sys_created_on": raw.get("sys_created_on"),
            "sys_updated_on": raw.get("sys_updated_on"),
        }


class RelationshipTransformer:
    @staticmethod
    def transform(raw: dict[str, Any], type_map: dict[str, dict[str, str]]) -> dict[str, Any]:
        rel_type_ref = raw.get("type", "")
        # ServiceNow returns sys_id reference or display value
        if isinstance(rel_type_ref, dict):
            rel_type_id = rel_type_ref.get("value", "")
        else:
            rel_type_id = str(rel_type_ref)

        type_info = type_map.get(rel_type_id, {})
        parent_ref = raw.get("parent", "")
        child_ref = raw.get("child", "")

        parent_id = parent_ref.get("value", parent_ref) if isinstance(parent_ref, dict) else str(parent_ref)
        child_id = child_ref.get("value", child_ref) if isinstance(child_ref, dict) else str(child_ref)

        return {
            "sys_id": raw.get("sys_id", ""),
            "parent_id": parent_id,
            "child_id": child_id,
            "rel_type": type_info.get("parent_descriptor", "Relates to"),
            "rel_type_reverse": type_info.get("child_descriptor", "Related by"),
        }


def _safe_int(val: Any) -> int | None:
    if val is None or val == "":
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _safe_float(val: Any) -> float | None:
    if val is None or val == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None
