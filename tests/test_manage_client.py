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

    assert exc_info.value.status_code == 502


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


@pytest.mark.asyncio
async def test_manage_client_forbidden_maps_to_502(monkeypatch):
    class MockResponse:
        status_code = 403

    async def mock_get(self, url, headers=None, params=None, **kwargs):
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    with pytest.raises(HTTPException) as exc_info:
        await ManageClient().list_users()
    assert exc_info.value.status_code == 502


@pytest.mark.asyncio
async def test_manage_client_trusts_server_pagination(monkeypatch):
    """Manage paginates itself and returns `pagination`; the page must not be sliced again.

    Regression: page 2 came back empty and `total` was capped at 20, so the
    Users screen only ever listed 20 of the 88 users.
    """
    sent = {}

    class MockResponse:
        status_code = 200

        def json(self):
            page, size = sent["params"]["page"], sent["params"]["page_size"]
            first = (page - 1) * size + 1
            return {
                "is_success": True,
                "data": [
                    {"id": i, "name": f"User {i}", "email": f"u{i}@dutai.io.vn"}
                    for i in range(first, min(first + size, 89))
                ],
                "pagination": {
                    "page": page,
                    "page_size": size,
                    "total": 88,
                    "total_pages": 5,
                    "has_next": page < 5,
                },
            }

        def raise_for_status(self):
            pass

    async def mock_get(self, url, headers=None, params=None, **kwargs):
        sent["params"] = params
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)
    client = ManageClient()

    page2 = await client.list_users(page=2, page_size=20)
    assert page2.total == 88
    assert [u.id for u in page2.items] == list(range(21, 41))

    last = await client.list_users(page=5, page_size=20)
    assert [u.id for u in last.items] == list(range(81, 89))


@pytest.mark.asyncio
async def test_manage_client_sends_search_as_keyword(monkeypatch):
    """Manage filters with `keyword`; it silently ignores `search`."""
    sent = {}

    class MockResponse:
        status_code = 200

        def json(self):
            return {
                "is_success": True,
                "data": [],
                "pagination": {"page": 1, "page_size": 20, "total": 0},
            }

        def raise_for_status(self):
            pass

    async def mock_get(self, url, headers=None, params=None, **kwargs):
        sent["params"] = params
        return MockResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    await ManageClient().list_users(page=1, page_size=20, search="  alice ")

    assert sent["params"]["keyword"] == "alice"
    assert "search" not in sent["params"]


@pytest.mark.asyncio
async def test_list_all_users_follows_every_page(monkeypatch):
    """Member profile lookups must see user #101+, not only the first page."""

    async def fake_list_users(self, page=1, page_size=20, search=None):
        from modules.identity.dtos.manage_dtos import (
            ManageUserDTO,
            ManageUsersResponseDTO,
        )

        first = (page - 1) * page_size + 1
        ids = range(first, min(first + page_size, 251))
        return ManageUsersResponseDTO(
            items=[ManageUserDTO(id=i, name=f"U{i}", email=f"u{i}@x.io") for i in ids],
            total=250,
            page=page,
            page_size=page_size,
        )

    monkeypatch.setattr(ManageClient, "list_users", fake_list_users)

    users = await ManageClient().list_all_users(page_size=100)

    assert [u.id for u in users] == list(range(1, 251))
