import httpx
import pytest

from app.exceptions import SnowAuthError, SnowResponseError
from etl.snow_client import SnowClient


class _StubAsyncClient:
    def __init__(self, responses: list[httpx.Response]) -> None:
        self._responses = responses

    async def get(self, url: str, params: dict[str, str | int]) -> httpx.Response:
        if len(self._responses) == 1:
            return self._responses[0]
        return self._responses.pop(0)


@pytest.mark.asyncio
class TestSnowClientResponseHandling:
    async def test_request_accepts_valid_json_payload(self, monkeypatch: pytest.MonkeyPatch) -> None:
        client = SnowClient("https://example.service-now.com", "user", "pass")
        response = httpx.Response(
            200,
            headers={"content-type": "application/json"},
            json={"result": [{"sys_id": "a" * 32}]},
        )

        monkeypatch.setattr("etl.snow_client._MAX_RETRIES", 1)
        monkeypatch.setattr(client, "_get_client", self._async_return(_StubAsyncClient([response])))

        payload = await client._request("/api/now/table/cmdb_rel_type", {})
        assert payload["result"][0]["sys_id"] == "a" * 32

    async def test_request_rejects_empty_body_with_http_200(self, monkeypatch: pytest.MonkeyPatch) -> None:
        client = SnowClient("https://example.service-now.com", "user", "pass")
        response = httpx.Response(
            200,
            headers={"content-type": "application/json", "content-length": "0"},
            content=b"",
        )

        monkeypatch.setattr("etl.snow_client._MAX_RETRIES", 1)
        monkeypatch.setattr(client, "_get_client", self._async_return(_StubAsyncClient([response])))

        with pytest.raises(SnowResponseError):
            await client._request("/api/now/table/cmdb_rel_type", {})

    async def test_request_rejects_html_login_page_with_http_200(self, monkeypatch: pytest.MonkeyPatch) -> None:
        client = SnowClient("https://example.service-now.com", "user", "pass")
        response = httpx.Response(
            200,
            headers={"content-type": "text/html; charset=utf-8"},
            content=b"<html><body>Login required</body></html>",
        )

        monkeypatch.setattr("etl.snow_client._MAX_RETRIES", 1)
        monkeypatch.setattr(client, "_get_client", self._async_return(_StubAsyncClient([response])))

        with pytest.raises(SnowAuthError):
            await client._request("/api/now/table/cmdb_rel_type", {})

    async def test_request_retries_hibernation_page_and_returns_service_error(self, monkeypatch: pytest.MonkeyPatch) -> None:
        client = SnowClient("https://example.service-now.com", "user", "pass")
        response = httpx.Response(
            200,
            headers={"content-type": "text/html; charset=utf-8"},
            content=(
                b"<html><head><title>Instance Hibernating page</title></head>"
                b"<body>developer.servicenow.com</body></html>"
            ),
        )

        monkeypatch.setattr("etl.snow_client._MAX_RETRIES", 1)
        monkeypatch.setattr(client, "_get_client", self._async_return(_StubAsyncClient([response])))

        with pytest.raises(SnowResponseError, match="hibernating"):
            await client._request("/api/now/table/cmdb_rel_type", {})

    async def test_request_rejects_invalid_json_with_http_200(self, monkeypatch: pytest.MonkeyPatch) -> None:
        client = SnowClient("https://example.service-now.com", "user", "pass")
        response = httpx.Response(
            200,
            headers={"content-type": "application/json"},
            content=b"{invalid-json",
        )

        monkeypatch.setattr("etl.snow_client._MAX_RETRIES", 1)
        monkeypatch.setattr(client, "_get_client", self._async_return(_StubAsyncClient([response])))

        with pytest.raises(SnowResponseError):
            await client._request("/api/now/table/cmdb_rel_type", {})

    @staticmethod
    def _async_return(value: object):
        async def _inner() -> object:
            return value

        return _inner