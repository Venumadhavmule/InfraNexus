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


class TestSearchAPIValidation:
    @pytest.mark.asyncio
    async def test_search_missing_query_returns_422(self, client: AsyncClient) -> None:
        resp = await client.get("/api/search")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_suggest_too_short_returns_422(self, client: AsyncClient) -> None:
        resp = await client.get("/api/search/suggest?q=a")
        assert resp.status_code == 422
