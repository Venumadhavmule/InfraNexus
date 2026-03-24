import pytest


@pytest.fixture
def sample_ci() -> dict:
    return {
        "sys_id": "a" * 32,
        "name": "test-server-01",
        "sys_class_name": "cmdb_ci_linux_server",
        "class_label": "Server",
        "environment": "Production",
        "operational_status": 1,
        "ip_address": "10.0.0.1",
        "fqdn": "test-server-01.example.com",
        "os": "Linux",
        "os_version": "Ubuntu 22.04",
        "cpu_count": 8,
        "ram_mb": 16384,
        "disk_space_gb": 500.0,
        "location": "US-East-1",
        "department": "Engineering",
        "assigned_to": "John Doe",
        "support_group": "Platform Team",
        "short_description": "Primary API server",
        "sys_created_on": "2024-01-15 10:30:00",
        "sys_updated_on": "2024-06-20 14:22:00",
    }


@pytest.fixture
def sample_cis() -> list[dict]:
    cis = []
    classes = [
        ("cmdb_ci_linux_server", "Server"),
        ("cmdb_ci_db_instance", "Database"),
        ("cmdb_ci_appl", "Application"),
        ("cmdb_ci_vm_instance", "Virtual Machine"),
        ("cmdb_ci_ip_switch", "Network"),
    ]
    for i in range(100):
        cls_name, cls_label = classes[i % len(classes)]
        cis.append({
            "sys_id": f"{i:032x}",
            "name": f"ci-{i:04d}",
            "sys_class_name": cls_name,
            "class_label": cls_label,
            "environment": "Production" if i % 3 == 0 else "Development",
            "operational_status": 1,
            "ip_address": f"10.0.{i // 256}.{i % 256}",
            "fqdn": f"ci-{i:04d}.example.com",
            "os": "",
            "os_version": "",
            "cpu_count": 4,
            "ram_mb": 8192,
            "disk_space_gb": 100.0,
            "location": "",
            "department": "",
            "assigned_to": "",
            "support_group": "",
            "short_description": f"Test CI {i}",
            "sys_created_on": "2024-01-01 00:00:00",
            "sys_updated_on": "2024-06-01 00:00:00",
        })
    return cis


@pytest.fixture
def sample_relationships(sample_cis: list[dict]) -> list[dict]:
    rels = []
    for i in range(min(len(sample_cis) - 1, 300)):
        parent_idx = i % len(sample_cis)
        child_idx = (i + 1) % len(sample_cis)
        rels.append({
            "sys_id": f"r{i:031x}",
            "parent_id": sample_cis[parent_idx]["sys_id"],
            "child_id": sample_cis[child_idx]["sys_id"],
            "rel_type": "Runs on" if i % 3 == 0 else "Depends on",
            "rel_type_reverse": "Runs" if i % 3 == 0 else "Used by",
        })
    return rels
