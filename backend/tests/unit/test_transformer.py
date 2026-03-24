from etl.transformer import CITransformer, CLASS_CATEGORIES, RelationshipTransformer


class TestCITransformer:
    def test_known_class_mapping(self) -> None:
        raw = {
            "sys_id": "a" * 32,
            "name": "test-server",
            "sys_class_name": "cmdb_ci_linux_server",
            "operational_status": "1",
        }
        result = CITransformer.transform(raw)
        assert result["class_label"] == "Server"
        assert result["sys_class_name"] == "cmdb_ci_linux_server"

    def test_unknown_class_maps_to_other(self) -> None:
        raw = {
            "sys_id": "b" * 32,
            "name": "unknown-thing",
            "sys_class_name": "cmdb_ci_unknown_widget",
        }
        result = CITransformer.transform(raw)
        assert result["class_label"] == "Other"

    def test_environment_normalization(self) -> None:
        for raw_env, expected in [
            ("production", "Production"),
            ("prod", "Production"),
            ("staging", "Staging"),
            ("dev", "Development"),
            ("qa", "QA"),
            ("uat", "UAT"),
        ]:
            raw = {
                "sys_id": "c" * 32,
                "name": "test",
                "sys_class_name": "cmdb_ci_server",
                "environment": raw_env,
            }
            result = CITransformer.transform(raw)
            assert result["environment"] == expected, f"{raw_env} -> {expected}"

    def test_missing_environment_becomes_unknown(self) -> None:
        raw = {
            "sys_id": "d" * 32,
            "name": "test",
            "sys_class_name": "cmdb_ci_server",
        }
        result = CITransformer.transform(raw)
        assert result["environment"] == "Unknown"

    def test_operational_status_defaults_to_1(self) -> None:
        raw = {
            "sys_id": "e" * 32,
            "name": "test",
            "sys_class_name": "cmdb_ci_server",
            "operational_status": "",
        }
        result = CITransformer.transform(raw)
        assert result["operational_status"] == 1

    def test_missing_optional_fields_are_empty(self) -> None:
        raw = {
            "sys_id": "f" * 32,
            "name": "minimal",
            "sys_class_name": "cmdb_ci_server",
        }
        result = CITransformer.transform(raw)
        assert result["ip_address"] == ""
        assert result["fqdn"] == ""
        assert result["cpu_count"] is None
        assert result["ram_mb"] is None

    def test_all_known_classes_covered(self) -> None:
        assert len(CLASS_CATEGORIES) >= 40


class TestRelationshipTransformer:
    def test_basic_transform(self) -> None:
        raw = {
            "sys_id": "r" + "1" * 31,
            "parent": "a" * 32,
            "child": "b" * 32,
            "type": "type123",
        }
        type_map = {
            "type123": {
                "parent_descriptor": "Runs on",
                "child_descriptor": "Runs",
            }
        }
        result = RelationshipTransformer.transform(raw, type_map)
        assert result["parent_id"] == "a" * 32
        assert result["child_id"] == "b" * 32
        assert result["rel_type"] == "Runs on"
        assert result["rel_type_reverse"] == "Runs"

    def test_dict_reference_fields(self) -> None:
        raw = {
            "sys_id": "r" + "2" * 31,
            "parent": {"value": "a" * 32},
            "child": {"value": "b" * 32},
            "type": {"value": "type456"},
        }
        type_map = {
            "type456": {
                "parent_descriptor": "Depends on",
                "child_descriptor": "Depended on by",
            }
        }
        result = RelationshipTransformer.transform(raw, type_map)
        assert result["parent_id"] == "a" * 32
        assert result["rel_type"] == "Depends on"

    def test_unknown_rel_type_uses_defaults(self) -> None:
        raw = {
            "sys_id": "r" + "3" * 31,
            "parent": "a" * 32,
            "child": "b" * 32,
            "type": "unknown_type",
        }
        result = RelationshipTransformer.transform(raw, {})
        assert result["rel_type"] == "Relates to"
        assert result["rel_type_reverse"] == "Related by"
