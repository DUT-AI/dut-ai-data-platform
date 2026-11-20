import httpx
import pytest

from modules.identity.client.auth_client import AuthClient
from modules.identity.client.http import build_manage_http_client
from modules.identity.client.manage_client import ManageClient


def _set_cookie_handler(request: httpx.Request) -> httpx.Response:
    return httpx.Response(
        200,
        headers={"set-cookie": "access_token=leak; Path=/; Domain=.dutai.io.vn"},
        json={
            "is_success": True,
            "data": {"access_token": "a", "refresh_token": "r", "token_type": "bearer"},
        },
    )


@pytest.mark.asyncio
async def test_shared_manage_client_never_stores_cookies():
    async with build_manage_http_client() as client:
        client._transport = httpx.MockTransport(_set_cookie_handler)
        await client.post("https://manage.dutai.io.vn/api/v1/auth/login", json={})
        assert len(client.cookies.jar) == 0


@pytest.mark.asyncio
async def test_fallback_clients_are_cookieless():
    for owner in (AuthClient(), ManageClient()):
        client = owner.client
        client._transport = httpx.MockTransport(_set_cookie_handler)
        await client.get("https://manage.dutai.io.vn/anything")
        assert len(client.cookies.jar) == 0
        await client.aclose()
