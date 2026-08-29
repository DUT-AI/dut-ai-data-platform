from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.main import app
from core.config import settings
from modules.identity.client.auth_client import AuthClient
from modules.identity.domain.entities import AuthUser
from modules.identity.dtos.auth_dtos import LoginResponseDTO


@pytest.mark.asyncio
async def test_login_sets_httponly_cookie():
    """POST /api/v1/auth/login returns token and sets HttpOnly cookie."""
    mock_token_resp = LoginResponseDTO(
        access_token="cookie-jwt-secret",
        refresh_token="ref-jwt-secret",
        token_type="bearer",
    )

    with (
        patch(
            "modules.identity.use_cases.LoginUseCase.execute", new_callable=AsyncMock
        ) as mock_login,
    ):
        mock_login.return_value = mock_token_resp

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/v1/auth/login",
                json={"email": "alice@example.com", "password": "password123"},
            )

        assert resp.status_code == 200
        set_cookie_header = resp.headers.get("set-cookie", "")
        assert settings.auth_cookie_name in set_cookie_header
        assert "httponly" in set_cookie_header.lower()
        assert "cookie-jwt-secret" in set_cookie_header


@pytest.mark.asyncio
async def test_get_me_with_httponly_cookie():
    """CurrentUser authenticates seamlessly via HttpOnly cookie."""
    mock_user = AuthUser(
        id=101,
        name="Alice",
        email="alice@example.com",
        status="ACTIVE",
        role_names=["ADMIN"],
    )

    with patch.object(AuthClient, "get_me", new_callable=AsyncMock) as mock_get_me:
        mock_get_me.return_value = mock_user

        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
            cookies={settings.auth_cookie_name: "cookie-token-abc"},
        ) as client:
            resp = await client.get("/api/v1/auth/me")

        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == 101
        assert data["name"] == "Alice"
        assert data["email"] == "alice@example.com"
        mock_get_me.assert_called_once_with("cookie-token-abc")


@pytest.mark.asyncio
async def test_get_me_single_remote_call_via_bearer():
    """CurrentUser maintains backward compatibility with Bearer header when cookie is absent."""
    mock_user = AuthUser(
        id=101,
        name="Alice",
        email="alice@example.com",
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
        assert data["email"] == "alice@example.com"

        # Crucial: AuthClient.get_me must be called EXACTLY ONCE
        assert mock_get_me.call_count == 1
        mock_get_me.assert_called_once_with("test-token-123")


@pytest.mark.asyncio
async def test_get_me_unauthenticated():
    """GET /api/v1/auth/me without cookie or Bearer token returns 401."""
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
async def test_logout_endpoint_clears_cookie():
    """POST /api/v1/auth/logout succeeds and clears the HttpOnly auth cookie."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post("/api/v1/auth/logout")

    assert resp.status_code == 200
    data = resp.json()
    assert data["is_success"] is True
    assert "message" in data

    # Verify Set-Cookie header expires or deletes the auth cookie
    set_cookie_header = resp.headers.get("set-cookie", "")
    assert settings.auth_cookie_name in set_cookie_header
    assert (
        "max-age=0" in set_cookie_header.lower()
        or "expires=" in set_cookie_header.lower()
        or '""' in set_cookie_header
    )


@pytest.mark.asyncio
async def test_get_me_does_not_update_last_login():
    """GET /api/v1/auth/me does not trigger last_login update."""
    mock_user = AuthUser(
        id=999,
        name="Bob",
        email="bob@example.com",
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
            transport=ASGITransport(app=app),
            base_url="http://test",
            cookies={settings.auth_cookie_name: "bob-cookie"},
        ) as client:
            resp = await client.get("/api/v1/auth/me")

        assert resp.status_code == 200
        # upsert_last_login must NOT be called on /me requests
        mock_upsert.assert_not_called()
