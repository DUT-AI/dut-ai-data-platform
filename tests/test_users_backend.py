from datetime import UTC, datetime
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import HTTPException

from apps.api.deps.auth import get_current_user
from apps.api.main import app
from modules.identity.client.manage_client import ManageClient
from modules.identity.domain.entities import AuthUser
from modules.identity.domain.interfaces import IUserLoginRepository
from modules.identity.dtos.manage_dtos import ManageUserDTO, ManageUsersResponseDTO
from modules.identity.use_cases.list_users import ListUsersUseCase


@pytest.mark.asyncio
async def test_list_users_use_case_merge_last_login():
    """Test 1: Merge external Manage users with local last_login_at timestamps."""
    manage_client = AsyncMock(spec=ManageClient)
    manage_client.list_users.return_value = ManageUsersResponseDTO(
        items=[
            ManageUserDTO(
                id="101",
                name="Alice",
                email="alice@dutai.io.vn",
                status="ACTIVE",
                avatar_url="https://avatar1.png",
                role_names=["ADMIN"],
            ),
            ManageUserDTO(
                id="102",
                name="Bob",
                email="bob@dutai.io.vn",
                status="INACTIVE",
                avatar_url=None,
                role_names=["ANNOTATOR"],
            ),
        ],
        total=2,
        page=1,
        page_size=20,
    )

    t1 = datetime(2026, 8, 20, 15, 30, 0, tzinfo=UTC)
    repo = AsyncMock(spec=IUserLoginRepository)
    repo.get_by_user_ids.return_value = {"101": t1}

    use_case = ListUsersUseCase(manage_client=manage_client, login_repo=repo)
    result = await use_case.execute(token="fake_token", page=1, page_size=20)

    assert result.total == 2
    assert len(result.items) == 2

    # User 101 has logged in before
    assert result.items[0].id == "101"
    assert result.items[0].name == "Alice"
    assert result.items[0].last_login_at == t1

    # User 102 has never logged in -> last_login_at is None
    assert result.items[1].id == "102"
    assert result.items[1].name == "Bob"
    assert result.items[1].last_login_at is None

    repo.get_by_user_ids.assert_awaited_once_with(["101", "102"])


@pytest.mark.asyncio
async def test_list_users_use_case_empty_users():
    """Test 2: Empty list returned by Manage Service does not trigger DB query."""
    manage_client = AsyncMock(spec=ManageClient)
    manage_client.list_users.return_value = ManageUsersResponseDTO(
        items=[],
        total=0,
        page=1,
        page_size=20,
    )

    repo = AsyncMock(spec=IUserLoginRepository)
    use_case = ListUsersUseCase(manage_client=manage_client, login_repo=repo)
    result = await use_case.execute(token="fake_token")

    assert result.total == 0
    assert result.items == []
    repo.get_by_user_ids.assert_not_called()


@pytest.mark.asyncio
async def test_list_users_use_case_manage_failure():
    """Test 3: Manage Service failure propagates error without returning fake local users."""
    manage_client = AsyncMock(spec=ManageClient)
    manage_client.list_users.side_effect = HTTPException(
        status_code=502, detail="Manage Service unavailable"
    )

    repo = AsyncMock(spec=IUserLoginRepository)
    use_case = ListUsersUseCase(manage_client=manage_client, login_repo=repo)

    with pytest.raises(HTTPException) as exc_info:
        await use_case.execute(token="fake_token")

    assert exc_info.value.status_code == 502
    assert "Manage Service unavailable" in exc_info.value.detail
    repo.get_by_user_ids.assert_not_called()


@pytest.mark.asyncio
async def test_list_users_use_case_pagination_and_search_forwarding():
    """Test 4: Pagination and search params are correctly forwarded to ManageClient."""
    manage_client = AsyncMock(spec=ManageClient)
    manage_client.list_users.return_value = ManageUsersResponseDTO(
        items=[],
        total=0,
        page=2,
        page_size=10,
    )

    repo = AsyncMock(spec=IUserLoginRepository)
    use_case = ListUsersUseCase(manage_client=manage_client, login_repo=repo)

    await use_case.execute(
        token="token_xyz",
        page=2,
        page_size=10,
        search="alice",
    )

    manage_client.list_users.assert_awaited_once_with(
        token="token_xyz",
        page=2,
        page_size=10,
        search="alice",
    )


@pytest.mark.asyncio
async def test_api_get_users_unauthenticated():
    """Test 5: Request without Authorization header returns 401 Unauthorized."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/users")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_api_get_users_authenticated_success(monkeypatch):
    """Test 6: Authenticated request returns 200 OK with UsersListResponseDTO schema."""
    mock_user = AuthUser(
        id=101,
        name="Test Operator",
        email="operator@dutai.io.vn",
        status="ACTIVE",
        role_names=["ADMIN"],
    )

    async def mock_list_users(self, token: str, page: int = 1, page_size: int = 20, search: str | None = None):
        return ManageUsersResponseDTO(
            items=[
                ManageUserDTO(
                    id="101",
                    name="Test Operator",
                    email="operator@dutai.io.vn",
                    status="ACTIVE",
                    avatar_url=None,
                    role_names=["ADMIN"],
                ),
                ManageUserDTO(
                    id="102",
                    name="New User",
                    email="new@dutai.io.vn",
                    status="ACTIVE",
                    avatar_url=None,
                    role_names=["USER"],
                ),
            ],
            total=2,
            page=page,
            page_size=page_size,
        )

    monkeypatch.setattr(ManageClient, "list_users", mock_list_users)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/v1/users?page=1&page_size=20",
            headers={"Authorization": "Bearer mock_valid_token"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 2
        assert data["page"] == 1
        assert data["page_size"] == 20
        assert len(data["items"]) == 2
        assert data["items"][0]["id"] == "101"
        assert data["items"][0]["name"] == "Test Operator"
        assert data["items"][1]["id"] == "102"
        assert "last_login_at" in data["items"][0]

    app.dependency_overrides.clear()
