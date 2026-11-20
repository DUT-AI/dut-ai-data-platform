from datetime import timedelta
from unittest.mock import AsyncMock, patch

import pytest
from auth_tokens import mint_manage_token
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from apps.api.main import app
from core.config.auth import auth_settings
from modules.identity.client.auth_client import AuthClient
from modules.identity.dtos.auth_dtos import TokenResponse


def _client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _manage_tokens(**access_kwargs) -> TokenResponse:
    return TokenResponse(
        access_token=mint_manage_token(**access_kwargs),
        refresh_token=mint_manage_token(
            token_type="refresh", expires_in=timedelta(days=7)
        ),
    )


@pytest.fixture
def local_login(monkeypatch):
    monkeypatch.setattr(auth_settings, "auth_local_login_enabled", True)


@pytest.fixture
def shared_domain(monkeypatch):
    monkeypatch.setattr(auth_settings, "auth_cookie_domain", ".dutai.io.vn")
    monkeypatch.setattr(auth_settings, "auth_cookie_secure", True)


# --- GET /auth/me: verify Manage access tokens locally -------------------------


@pytest.mark.asyncio
async def test_me_accepts_manage_access_cookie():
    token = mint_manage_token(
        202,
        name="Bob",
        email="bob@example.com",
        roles=["Leader"],
        avatar="https://a/b.png",
    )
    async with _client() as client:
        resp = await client.get(
            "/api/v1/auth/me", cookies={auth_settings.auth_cookie_name: token}
        )

    assert resp.status_code == 200
    assert resp.json() == {
        "id": 202,
        "name": "Bob",
        "email": "bob@example.com",
        "status": "ACTIVE",
        "avatar_url": "https://a/b.png",
        "role_names": ["Leader"],
    }


@pytest.mark.asyncio
async def test_me_accepts_bearer_header():
    token = mint_manage_token(203)
    async with _client() as client:
        resp = await client.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
    assert resp.status_code == 200
    assert resp.json()["id"] == 203


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "token",
    [
        mint_manage_token(token_type="refresh"),
        mint_manage_token(expires_in=timedelta(minutes=-1)),
        mint_manage_token(secret="another-secret"),
        mint_manage_token("abc"),
        mint_manage_token(0),
    ],
    ids=["refresh-as-access", "expired", "wrong-secret", "non-int-sub", "zero-sub"],
)
async def test_me_rejects_invalid_tokens(token):
    async with _client() as client:
        resp = await client.get(
            "/api/v1/auth/me", cookies={auth_settings.auth_cookie_name: token}
        )
    assert resp.status_code == 401
    assert resp.headers["www-authenticate"] == "Bearer"


@pytest.mark.asyncio
async def test_me_without_token_returns_401():
    async with _client() as client:
        resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


# --- POST /auth/login: local development only ----------------------------------


@pytest.mark.asyncio
async def test_login_disabled_returns_404():
    with patch.object(AuthClient, "login", new_callable=AsyncMock) as mock_login:
        async with _client() as client:
            resp = await client.post(
                "/api/v1/auth/login", json={"email": "a@example.com", "password": "x"}
            )
    assert resp.status_code == 404
    mock_login.assert_not_called()
    assert "set-cookie" not in resp.headers


@pytest.mark.asyncio
async def test_local_login_keeps_manage_tokens_in_host_only_cookies(local_login):
    tokens = _manage_tokens(user_id=101)
    with patch.object(AuthClient, "login", new_callable=AsyncMock, return_value=tokens):
        async with _client() as client:
            resp = await client.post(
                "/api/v1/auth/login",
                json={"email": "alice@example.com", "password": "pw"},
            )

    assert resp.status_code == 200
    assert resp.json()["id"] == 101
    assert tokens.access_token not in resp.text

    cookies = resp.headers.get_list("set-cookie")
    assert len(cookies) == 2
    access = next(
        c for c in cookies if c.startswith(f"{auth_settings.auth_cookie_name}=")
    )
    refresh = next(
        c for c in cookies if c.startswith(f"{auth_settings.auth_refresh_cookie_name}=")
    )
    assert tokens.access_token in access
    assert tokens.refresh_token in refresh
    for cookie in cookies:
        lowered = cookie.lower()
        assert "httponly" in lowered
        assert "domain=" not in lowered
        assert "max-age=" in lowered


@pytest.mark.asyncio
async def test_local_login_rejects_tokens_signed_with_other_secret(local_login):
    tokens = TokenResponse(
        access_token=mint_manage_token(secret="another-secret"),
        refresh_token=mint_manage_token(token_type="refresh", secret="another-secret"),
    )
    with patch.object(AuthClient, "login", new_callable=AsyncMock, return_value=tokens):
        async with _client() as client:
            resp = await client.post(
                "/api/v1/auth/login", json={"email": "a@example.com", "password": "x"}
            )
    assert resp.status_code == 401
    assert "set-cookie" not in resp.headers


@pytest.mark.asyncio
async def test_local_login_bad_credentials_returns_401(local_login):
    with patch.object(
        AuthClient,
        "login",
        new_callable=AsyncMock,
        side_effect=HTTPException(
            status_code=401, detail="Email hoặc mật khẩu không chính xác."
        ),
    ):
        async with _client() as client:
            resp = await client.post(
                "/api/v1/auth/login", json={"email": "a@example.com", "password": "bad"}
            )
    assert resp.status_code == 401
    assert "set-cookie" not in resp.headers


# --- POST /auth/logout ----------------------------------------------------------


@pytest.mark.asyncio
async def test_logout_clears_shared_cookies_on_parent_domain(shared_domain):
    async with _client() as client:
        resp = await client.post("/api/v1/auth/logout")

    assert resp.status_code == 200
    assert resp.json()["is_success"] is True
    cookies = [c.lower() for c in resp.headers.get_list("set-cookie")]
    assert len(cookies) == 2
    for name in (
        auth_settings.auth_cookie_name,
        auth_settings.auth_refresh_cookie_name,
    ):
        cookie = next(c for c in cookies if c.startswith(f"{name}="))
        assert "domain=.dutai.io.vn" in cookie
        assert "max-age=0" in cookie
        assert "secure" in cookie


# --- Authorization from the Manage `roles` claim -------------------------------


@pytest.mark.asyncio
async def test_system_role_comes_from_manage_roles_claim():
    from fastapi import Depends, FastAPI

    from apps.api.deps.roles import require_system_role

    probe = FastAPI()

    @probe.get("/probe")
    async def _probe(role: str = Depends(require_system_role("admin"))) -> dict:
        return {"role": role}

    async with AsyncClient(
        transport=ASGITransport(app=probe), base_url="http://test"
    ) as client:
        ok = await client.get(
            "/probe",
            cookies={
                auth_settings.auth_cookie_name: mint_manage_token(roles=["Admin"])
            },
        )
        denied = await client.get(
            "/probe",
            cookies={
                auth_settings.auth_cookie_name: mint_manage_token(roles=["Teammate"])
            },
        )

    assert ok.status_code == 200
    assert ok.json() == {"role": "admin"}
    assert denied.status_code == 403
