from datetime import timedelta
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from apps.api.main import app
from core.config import settings
from core.security.jwt import create_access_token, decode_access_token
from modules.identity.client.auth_client import AuthClient
from modules.identity.domain.entities import AuthUser, TokenResponse


@pytest.mark.asyncio
async def test_login_issues_platform_jwt_and_sets_httponly_cookie():
    """POST /api/v1/auth/login validates credentials via Manage, issues Data Platform's own JWT, and sets cookie."""
    mock_manage_token = TokenResponse(
        access_token="manage-temporary-token-123",
        refresh_token="manage-ref-token",
        token_type="bearer",
    )
    mock_manage_user = AuthUser(
        id=101,
        name="Alice",
        email="alice@example.com",
        status="ACTIVE",
        role_names=["ADMIN"],
    )

    with (
        patch.object(AuthClient, "login", new_callable=AsyncMock) as mock_login,
        patch.object(AuthClient, "get_me", new_callable=AsyncMock) as mock_get_me,
    ):
        mock_login.return_value = mock_manage_token
        mock_get_me.return_value = mock_manage_user

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/v1/auth/login",
                json={"email": "alice@example.com", "password": "password123"},
            )

        assert resp.status_code == 200
        data = resp.json()
        platform_token = data["access_token"]

        # Crucial check: Platform token is NOT the Manage token
        assert platform_token != "manage-temporary-token-123"

        # Verify Platform JWT claims
        claims = decode_access_token(platform_token)
        assert claims["sub"] == "101"
        assert claims["email"] == "alice@example.com"
        assert claims["name"] == "Alice"
        assert claims["role_names"] == ["ADMIN"]
        assert claims["iss"] == "dut-ai-data-platform"

        # Verify HttpOnly Cookie
        set_cookie_header = resp.headers.get("set-cookie", "")
        assert settings.auth_cookie_name in set_cookie_header
        assert "httponly" in set_cookie_header.lower()
        assert platform_token in set_cookie_header


@pytest.mark.asyncio
async def test_login_fails_when_manage_login_fails():
    """Failed Manage login results in 401, no cookie, and no token issued."""
    with patch.object(AuthClient, "login", new_callable=AsyncMock) as mock_login:
        mock_login.side_effect = HTTPException(
            status_code=401, detail="Email hoặc mật khẩu sai."
        )

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/v1/auth/login",
                json={"email": "wrong@example.com", "password": "bad"},
            )

        assert resp.status_code == 401
        assert "set-cookie" not in resp.headers


@pytest.mark.asyncio
async def test_login_fails_when_manage_get_me_fails():
    """If Manage /me verification fails, login stops and no Platform token is issued."""
    mock_manage_token = TokenResponse(
        access_token="manage-temporary-token-123",
        refresh_token="manage-ref-token",
        token_type="bearer",
    )

    with (
        patch.object(AuthClient, "login", new_callable=AsyncMock) as mock_login,
        patch.object(AuthClient, "get_me", new_callable=AsyncMock) as mock_get_me,
    ):
        mock_login.return_value = mock_manage_token
        mock_get_me.side_effect = HTTPException(
            status_code=401, detail="Manage session expired."
        )

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/v1/auth/login",
                json={"email": "alice@example.com", "password": "password123"},
            )

        assert resp.status_code == 401
        assert "set-cookie" not in resp.headers


@pytest.mark.asyncio
async def test_get_me_verifies_platform_jwt_locally_without_calling_manage():
    """CurrentUser verifies Platform JWT locally via Cookie; AuthClient.get_me is NOT called."""
    platform_token = create_access_token(
        {
            "sub": "101",
            "email": "alice@example.com",
            "name": "Alice",
            "role_names": ["ADMIN"],
        }
    )

    with patch.object(AuthClient, "get_me", new_callable=AsyncMock) as mock_get_me:
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
            cookies={settings.auth_cookie_name: platform_token},
        ) as client:
            resp = await client.get("/api/v1/auth/me")

        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == 101
        assert data["name"] == "Alice"
        assert data["email"] == "alice@example.com"
        assert data["role_names"] == ["ADMIN"]

        # ZERO network calls to Manage Server on protected requests!
        mock_get_me.assert_not_called()


@pytest.mark.asyncio
async def test_get_me_backward_compatibility_with_bearer_header():
    """CurrentUser verifies Platform JWT via Authorization Bearer header locally."""
    platform_token = create_access_token(
        {
            "sub": "102",
            "email": "bob@example.com",
            "name": "Bob",
            "role_names": ["ANNOTATOR"],
        }
    )

    with patch.object(AuthClient, "get_me", new_callable=AsyncMock) as mock_get_me:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {platform_token}"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == 102
        assert data["email"] == "bob@example.com"
        mock_get_me.assert_not_called()


@pytest.mark.asyncio
async def test_get_me_expired_platform_token_returns_401():
    """Expired Platform JWT returns 401."""
    expired_token = create_access_token(
        {"sub": "101", "email": "alice@example.com"},
        expires_delta=timedelta(minutes=-10),
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        cookies={settings.auth_cookie_name: expired_token},
    ) as client:
        resp = await client.get("/api/v1/auth/me")

    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_unauthenticated_returns_401():
    """GET /api/v1/auth/me without cookie or Bearer token returns 401."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/v1/auth/me")

    assert resp.status_code == 401


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

    set_cookie_header = resp.headers.get("set-cookie", "")
    assert settings.auth_cookie_name in set_cookie_header
    assert (
        "max-age=0" in set_cookie_header.lower()
        or "expires=" in set_cookie_header.lower()
        or '""' in set_cookie_header
    )
