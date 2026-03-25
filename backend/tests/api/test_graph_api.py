import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
async def client():
    from app.main import create_app
    from app.core.stubs import StubKuzuManager, StubRedisManager, StubMeiliManager
    from app.core.ws_manager import ConnectionManager

    app = create_app()
    app.state.kuzu = StubKuzuManager()
    app.state.redis = StubRedisManager()
    app.state.meili = StubMeiliManager()
    app.state.ws_manager = ConnectionManager()
    app.state.etl_state_manager = None
    app.state.etl_runner = None
    app.state.etl_scheduler = None
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


class TestGraphAPIValidation:
    @pytest.mark.asyncio
    async def test_invalid_sys_id_returns_422(self, client: AsyncClient) -> None:
        resp = await client.get("/api/graph/neighborhood/invalid-id")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_hops_too_large_returns_422(self, client: AsyncClient) -> None:
        ci_id = "a" * 32
        resp = await client.get(f"/api/graph/neighborhood/{ci_id}?hops=5")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_max_nodes_too_large_returns_422(self, client: AsyncClient) -> None:
        ci_id = "a" * 32
        resp = await client.get(f"/api/graph/neighborhood/{ci_id}?max_nodes=5000")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_path_invalid_source_returns_422(self, client: AsyncClient) -> None:
        resp = await client.get(f"/api/graph/path/invalid/{'b' * 32}")
        assert resp.status_code == 422
