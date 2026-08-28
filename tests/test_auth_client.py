import httpx
import pytest
from fastapi import HTTPException

from modules.identity.client.auth_client import AuthClient


@pytest.mark.asyncio
async def test_auth_client_build_url():
    client1 = AuthClient(auth_server_url="https://manage.dutai.io.vn/api/v1")
    assert client1._build_url("/auth/login") == "https://manage.dutai.io.vn/api/v1/auth/login"
    assert client1._build_url("api/v1/auth/login") == "https://manage.dutai.io.vn/api/v1/auth/login"

    client2 = AuthClient(auth_server_url="https://manage.dutai.io.vn")
    assert client2._build_url("/api/v1/auth/login") == "https://manage.dutai.io.vn/api/v1/auth/login"


@pytest.mark.asyncio
async def test_auth_client_login_success(monkeypatch):
    class MockResponse:
        status_code = 200
        content = b'{"is_success": true, "data": {"access_token": "acc_123", "refresh_token": "ref_123", "token_type": "bearer"}}'

        def json(self):
            return {
                "is_success": True,
                "data": {
                    "access_token": "acc_123",
                    "refresh_token": "ref_123",
                    "token_type": "bearer",
                },
            }

        def raise_for_status(self):
            pass

    async def mock_post(self, url, json=None, **kwargs):
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    client = AuthClient(auth_server_url="https://manage.dutai.io.vn/api/v1")
    token_resp = await client.login("test@dutai.io.vn", "password123")

    assert token_resp.access_token == "acc_123"
    assert token_resp.refresh_token == "ref_123"
    assert token_resp.token_type == "bearer"


@pytest.mark.asyncio
async def test_auth_client_login_invalid_credentials(monkeypatch):
    class MockResponse:
        status_code = 401
        content = b'{"message": "Email \xc4\x91\xc3\xa3 nh\xe1\xba\xadp sai"}'

        def json(self):
            return {"message": "Email đã nhập sai"}

    async def mock_post(self, url, json=None, **kwargs):
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    client = AuthClient(auth_server_url="https://manage.dutai.io.vn/api/v1")
    with pytest.raises(HTTPException) as exc_info:
        await client.login("wrong@dutai.io.vn", "badpass")

    assert exc_info.value.status_code == 401
    assert "Email đã nhập sai" in exc_info.value.detail


@pytest.mark.asyncio
async def test_auth_client_get_me_success(monkeypatch):
    class MockResponse:
        status_code = 200

        def json(self):
            return {
                "is_success": True,
                "data": {
                    "id": 101,
                    "name": "Nguyen Van A",
                    "email": "a@dutai.io.vn",
                    "status": "ACTIVE",
                    "avatar_url": "https://avatar.png",
                    "role_names": ["ADMIN"],
                },
            }

        def raise_for_status(self):
            pass

    async def mock_get(self, url, headers=None, **kwargs):
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    client = AuthClient(auth_server_url="https://manage.dutai.io.vn/api/v1")
    user = await client.get_me("dummy_token")

    assert user.id == 101
    assert user.name == "Nguyen Van A"
    assert user.email == "a@dutai.io.vn"
    assert user.role_names == ["ADMIN"]


@pytest.mark.asyncio
async def test_auth_client_get_me_expired_token(monkeypatch):
    class MockResponse:
        status_code = 401

    async def mock_get(self, url, headers=None, **kwargs):
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    client = AuthClient(auth_server_url="https://manage.dutai.io.vn/api/v1")
    with pytest.raises(HTTPException) as exc_info:
        await client.get_me("expired_token")

    assert exc_info.value.status_code == 401
