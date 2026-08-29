import httpx
import pytest
from fastapi import HTTPException

from modules.identity.client.manage_client import ManageClient


@pytest.mark.asyncio
async def test_manage_client_build_url():
    client1 = ManageClient(manage_server_url="https://manage.example.com/api/v1")
    assert client1._build_url("/users") == "https://manage.example.com/api/v1/users"
    assert (
        client1._build_url("api/v1/users") == "https://manage.example.com/api/v1/users"
    )

    client2 = ManageClient(manage_server_url="https://manage.example.com")
    assert (
        client2._build_url("/api/v1/users") == "https://manage.example.com/api/v1/users"
    )


@pytest.mark.asyncio
async def test_manage_client_list_users_paginated(monkeypatch):
    class MockResponse:
        status_code = 200

        def json(self):
            return {
                "is_success": True,
                "data": {
                    "items": [
                        {
                            "id": "usr_1",
                            "name": "User One",
                            "email": "user1@dutai.io.vn",
                            "status": "ACTIVE",
                            "avatar_url": None,
                            "role_names": ["ANNOTATOR"],
                        },
                        {
                            "id": "usr_2",
                            "name": "User Two",
                            "email": "user2@dutai.io.vn",
                            "status": "INACTIVE",
                            "avatar_url": "https://avatar.png",
                            "role_names": ["MANAGER"],
                        },
                    ],
                    "total": 2,
                    "page": 1,
                    "page_size": 20,
                },
            }

        def raise_for_status(self):
            pass

    async def mock_get(self, url, headers=None, params=None, **kwargs):
        assert headers.get("Authorization") == "Bearer valid_token"
        assert params.get("page") == 1
        assert params.get("page_size") == 20
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    client = ManageClient(manage_server_url="https://manage.example.com/api/v1")
    res = await client.list_users(token="valid_token", page=1, page_size=20)

    assert res.total == 2
    assert len(res.items) == 2
    assert res.items[0].id == "usr_1"
    assert res.items[0].name == "User One"
    assert res.items[0].role_names == ["ANNOTATOR"]
    assert res.items[1].id == "usr_2"


@pytest.mark.asyncio
async def test_manage_client_list_users_list_envelope(monkeypatch):
    class MockResponse:
        status_code = 200

        def json(self):
            return {
                "is_success": True,
                "data": [
                    {
                        "id": 10,
                        "name": "Direct List User",
                        "email": "direct@dutai.io.vn",
                        "role": "USER",
                    }
                ],
            }

        def raise_for_status(self):
            pass

    async def mock_get(self, url, headers=None, params=None, **kwargs):
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    client = ManageClient(manage_server_url="https://manage.example.com/api/v1")
    res = await client.list_users(token="valid_token")

    assert res.total == 1
    assert len(res.items) == 1
    assert res.items[0].id == 10
    assert res.items[0].name == "Direct List User"
    assert res.items[0].role_names == ["USER"]


@pytest.mark.asyncio
async def test_manage_client_unauthorized(monkeypatch):
    class MockResponse:
        status_code = 401

    async def mock_get(self, url, headers=None, params=None, **kwargs):
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    client = ManageClient(manage_server_url="https://manage.example.com/api/v1")
    with pytest.raises(HTTPException) as exc_info:
        await client.list_users(token="invalid_token")

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_manage_client_timeout(monkeypatch):
    async def mock_get(self, url, headers=None, params=None, **kwargs):
        raise httpx.TimeoutException("Connection timed out")

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    client = ManageClient(manage_server_url="https://manage.example.com/api/v1")
    with pytest.raises(HTTPException) as exc_info:
        await client.list_users(token="token")

    assert exc_info.value.status_code == 504
