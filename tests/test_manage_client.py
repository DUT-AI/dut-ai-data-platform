import httpx
import pytest
from fastapi import HTTPException

from modules.identity.client.manage_client import ManageClient


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

    client = ManageClient()
    res = await client.list_users()

    assert res.total == 1
    assert len(res.items) == 1
    assert res.items[0].id == 10
    assert res.items[0].name == "Direct List User"
    assert res.items[0].role_names == ["USER"]


@pytest.mark.asyncio
async def test_manage_client_list_users_direct_list_pagination_slicing(monkeypatch):
    """Test that when Manage server returns an unpaginated array of 25 items, ManageClient properly slices pages."""

    class MockResponse:
        status_code = 200

        def json(self):
            return {
                "is_success": True,
                "data": [
                    {
                        "id": i,
                        "name": f"User {i}",
                        "email": f"user{i}@dutai.io.vn",
                        "role": "USER",
                    }
                    for i in range(1, 26)
                ],
            }

        def raise_for_status(self):
            pass

    async def mock_get(self, url, headers=None, params=None, **kwargs):
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    client = ManageClient()
    # Page 1 with pageSize=20 -> should return 20 items (ids 1..20)
    page1 = await client.list_users(page=1, page_size=20)
    assert page1.total == 25
    assert len(page1.items) == 20
    assert page1.items[0].id == 1
    assert page1.items[-1].id == 20

    # Page 2 with pageSize=20 -> should return remaining 5 items (ids 21..25)
    page2 = await client.list_users(page=2, page_size=20)
    assert page2.total == 25
    assert len(page2.items) == 5
    assert page2.items[0].id == 21
    assert page2.items[-1].id == 25


@pytest.mark.asyncio
async def test_manage_client_unauthorized(monkeypatch):
    class MockResponse:
        status_code = 401

    async def mock_get(self, url, headers=None, params=None, **kwargs):
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    client = ManageClient()
    with pytest.raises(HTTPException) as exc_info:
        await client.list_users()

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_manage_client_timeout(monkeypatch):
    async def mock_get(self, url, headers=None, params=None, **kwargs):
        raise httpx.TimeoutException("Connection timed out")

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    client = ManageClient()
    with pytest.raises(HTTPException) as exc_info:
        await client.list_users()

    assert exc_info.value.status_code == 504


@pytest.mark.asyncio
async def test_manage_client_error_envelope(monkeypatch):
    class MockResponse:
        status_code = 200

        def json(self):
            return {
                "is_success": False,
                "data": None,
                "message": "Manage service internal failure",
            }

        def raise_for_status(self):
            pass

    async def mock_get(self, url, headers=None, params=None, **kwargs):
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    client = ManageClient()
    with pytest.raises(HTTPException) as exc_info:
        await client.list_users()

    assert exc_info.value.status_code == 400
    assert "Manage service internal failure" in exc_info.value.detail
