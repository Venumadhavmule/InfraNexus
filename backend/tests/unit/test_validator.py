from etl.validator import CIValidator, RelationshipValidator


class TestCIValidator:
    def test_valid_ci(self, sample_ci: dict) -> None:
        valid, errors = CIValidator.validate(sample_ci)
        assert valid is True
        assert errors == []

    def test_invalid_sys_id_too_short(self) -> None:
        ci = {"sys_id": "abc", "name": "test", "sys_class_name": "cmdb_ci_server"}
        valid, errors = CIValidator.validate(ci)
        assert valid is False
        assert any("sys_id" in e for e in errors)

    def test_invalid_sys_id_uppercase(self) -> None:
        ci = {"sys_id": "A" * 32, "name": "test", "sys_class_name": "cmdb_ci_server"}
        valid, errors = CIValidator.validate(ci)
        assert valid is False
        assert any("sys_id" in e for e in errors)

    def test_missing_name(self) -> None:
        ci = {"sys_id": "a" * 32, "name": "", "sys_class_name": "cmdb_ci_server"}
        valid, errors = CIValidator.validate(ci)
        assert valid is False
        assert any("name" in e for e in errors)

    def test_missing_sys_class_name(self) -> None:
        ci = {"sys_id": "a" * 32, "name": "test", "sys_class_name": ""}
        valid, errors = CIValidator.validate(ci)
        assert valid is False
        assert any("sys_class_name" in e for e in errors)

    def test_operational_status_out_of_range(self) -> None:
        ci = {
            "sys_id": "a" * 32,
            "name": "test",
            "sys_class_name": "cmdb_ci_server",
            "operational_status": 99,
        }
        valid, errors = CIValidator.validate(ci)
        assert valid is False
        assert any("operational_status" in e for e in errors)

    def test_operational_status_valid_boundary(self) -> None:
        for status in (1, 6):
            ci = {
                "sys_id": "a" * 32,
                "name": "test",
                "sys_class_name": "cmdb_ci_server",
                "operational_status": status,
            }
            valid, _ = CIValidator.validate(ci)
            assert valid is True


class TestRelationshipValidator:
    def test_valid_relationship(self) -> None:
        rel = {
            "parent_id": "a" * 32,
            "child_id": "b" * 32,
            "rel_type": "Runs on",
        }
        valid, errors = RelationshipValidator.validate(rel)
        assert valid is True
        assert errors == []

    def test_invalid_parent_sys_id(self) -> None:
        rel = {
            "parent_id": "invalid",
            "child_id": "b" * 32,
            "rel_type": "Runs on",
        }
        valid, errors = RelationshipValidator.validate(rel)
        assert valid is False
        assert any("parent" in e for e in errors)

    def test_self_loop_rejected(self) -> None:
        rel = {
            "parent_id": "a" * 32,
            "child_id": "a" * 32,
            "rel_type": "Runs on",
        }
        valid, errors = RelationshipValidator.validate(rel)
        assert valid is False
        assert any("Self-loop" in e for e in errors)

    def test_missing_rel_type(self) -> None:
        rel = {
            "parent_id": "a" * 32,
            "child_id": "b" * 32,
            "rel_type": "",
        }
        valid, errors = RelationshipValidator.validate(rel)
        assert valid is False
        assert any("rel_type" in e for e in errors)
