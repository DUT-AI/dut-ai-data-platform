from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.main import app
from modules.identity.client.auth_client import AuthClient
from modules.identity.domain.entities import AuthUser


@pytest.mark.asyncio
async def test_get_me_single_remote_call():
    """Verify GET /api/v1/auth/me calls AuthClient.get_me exactly once via CurrentUser."""
    mock_user = AuthUser(
        id=101,
        name="Alice",
        email="alice@dutai.io.vn",
        status="ACTIVE",
        role_names=["ADMIN"],
    )

    with patch.object(AuthClient, "get_me", new_callable=AsyncMock) as mock_get_me:
        mock_get_me.return_value = mock_user

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": "Bearer test-token-123"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == 101
        assert data["name"] == "Alice"
        assert data["email"] == "alice@dutai.io.vn"

        # Crucial: AuthClient.get_me must be called EXACTLY ONCE
        assert mock_get_me.call_count == 1
        mock_get_me.assert_called_once_with("test-token-123")


@pytest.mark.asyncio
async def test_get_me_unauthenticated():
    """GET /api/v1/auth/me without token returns 401."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/v1/auth/me")

    assert resp.status_code == 401
    assert (
        "Authorization" in resp.json()["detail"]
        or "token" in resp.json()["detail"].lower()
    )


@pytest.mark.asyncio
async def test_logout_endpoint():
    """POST /api/v1/auth/logout succeeds with 200 and standard response."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post("/api/v1/auth/logout")

    assert resp.status_code == 200
    data = resp.json()
    assert data["is_success"] is True
    assert "message" in data


@pytest.mark.asyncio
async def test_get_me_does_not_update_last_login():
    """GET /api/v1/auth/me does not trigger last_login update."""
    mock_user = AuthUser(
        id=999,
        name="Bob",
        email="bob@dutai.io.vn",
        status="ACTIVE",
        role_names=["USER"],
    )

    with (
        patch.object(AuthClient, "get_me", new_callable=AsyncMock) as mock_get_me,
        patch(
            "modules.identity.repository.user_login_repository.SqlUserLoginRepository.upsert_last_login",
            new_callable=AsyncMock,
        ) as mock_upsert,
    ):
        mock_get_me.return_value = mock_user

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": "Bearer bob-token"},
            )

        assert resp.status_code == 200
        # upsert_last_login must NOT be called on /me requests
        mock_upsert.assert_not_called()
