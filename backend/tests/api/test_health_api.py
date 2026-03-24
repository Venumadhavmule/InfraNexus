import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
async def client():
    """Minimal test client — only tests health endpoints that don't require infra."""
    from app.main import create_app

    app = create_app()
    # Override lifespan to skip external deps for unit-level API shape tests
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


class TestHealthAPI:
    @pytest.mark.asyncio
    async def test_health_returns_ok(self, client: AsyncClient) -> None:
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "timestamp" in data

    @pytest.mark.asyncio
    async def test_ready_returns_not_ready_without_deps(self, client: AsyncClient) -> None:
        resp = await client.get("/ready")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "not_ready"
        assert "checks" in data
