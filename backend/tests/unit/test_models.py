import pytest
from pydantic import ValidationError

from app.models.base import ErrorResponse, PaginatedRequest
from app.models.graph import GraphEdge, GraphNode, NeighborhoodResponse
from app.models.ci import CIDetail
from app.models.etl import SyncStatus, SyncType
from app.models.health import HealthResponse
from app.models.search import SearchHit


class TestSysIdValidation:
    def test_valid_sys_id(self) -> None:
        node = GraphNode(
            id="a" * 32,
            name="test",
            ci_class="Server",
            ci_class_raw="cmdb_ci_server",
            environment="Production",
            operational_status=1,
        )
        assert node.id == "a" * 32

    def test_invalid_sys_id_too_short(self) -> None:
        with pytest.raises(ValidationError):
            GraphNode(
                id="abc",
                name="test",
                ci_class="Server",
                ci_class_raw="cmdb_ci_server",
                environment="Production",
                operational_status=1,
            )

    def test_invalid_sys_id_uppercase(self) -> None:
        with pytest.raises(ValidationError):
            GraphNode(
                id="A" * 32,
                name="test",
                ci_class="Server",
                ci_class_raw="cmdb_ci_server",
                environment="Production",
                operational_status=1,
            )

    def test_invalid_sys_id_non_hex(self) -> None:
        with pytest.raises(ValidationError):
            GraphNode(
                id="g" * 32,
                name="test",
                ci_class="Server",
                ci_class_raw="cmdb_ci_server",
                environment="Production",
                operational_status=1,
            )


class TestGraphModels:
    def test_graph_node_defaults(self) -> None:
        node = GraphNode(
            id="a" * 32,
            name="test",
            ci_class="Server",
            ci_class_raw="cmdb_ci_server",
            environment="Production",
            operational_status=1,
        )
        assert node.degree == 0
        assert node.cluster_id == -1
        assert node.x is None

    def test_graph_edge(self) -> None:
        edge = GraphEdge(
            source="a" * 32,
            target="b" * 32,
            rel_type="Runs on",
        )
        assert edge.rel_type_reverse == ""

    def test_neighborhood_response(self) -> None:
        resp = NeighborhoodResponse(
            nodes=[],
            edges=[],
            center_id="a" * 32,
            total_in_neighborhood=0,
            query_time_ms=1.5,
        )
        assert resp.truncated is False
        assert resp.cached is False


class TestPaginatedRequest:
    def test_defaults(self) -> None:
        req = PaginatedRequest()
        assert req.limit == 20
        assert req.offset == 0

    def test_limit_bounds(self) -> None:
        with pytest.raises(ValidationError):
            PaginatedRequest(limit=0)
        with pytest.raises(ValidationError):
            PaginatedRequest(limit=101)

    def test_offset_bounds(self) -> None:
        with pytest.raises(ValidationError):
            PaginatedRequest(offset=-1)


class TestEnums:
    def test_sync_type(self) -> None:
        assert SyncType.full.value == "full"
        assert SyncType.incremental.value == "incremental"

    def test_sync_status(self) -> None:
        assert SyncStatus.idle.value == "idle"
        assert SyncStatus.running.value == "running"
        assert SyncStatus.failed.value == "failed"


class TestHealthResponse:
    def test_ok_status(self) -> None:
        resp = HealthResponse(status="ok")
        assert resp.status == "ok"
        assert resp.timestamp is not None
