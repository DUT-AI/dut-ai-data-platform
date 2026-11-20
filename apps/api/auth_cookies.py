"""Shared DUT AI SSO cookies: same names, scope and flags as DUT AI Manage."""

from datetime import UTC, datetime
from typing import Any

from fastapi import Response

from core.config.auth import auth_settings
from modules.identity.dtos.auth_dtos import SsoSessionDTO


def _cookie_kwargs() -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "httponly": True,
        "secure": auth_settings.auth_cookie_secure,
        "samesite": auth_settings.auth_cookie_samesite,
        "path": "/",
    }
    if auth_settings.auth_cookie_domain:
        kwargs["domain"] = auth_settings.auth_cookie_domain
    return kwargs


def set_sso_cookies(response: Response, session: SsoSessionDTO) -> None:
    now = int(datetime.now(UTC).timestamp())
    kwargs = _cookie_kwargs()
    response.set_cookie(
        key=auth_settings.auth_cookie_name,
        value=session.access_token,
        max_age=max(0, session.access_expires_at - now),
        **kwargs,
    )
    response.set_cookie(
        key=auth_settings.auth_refresh_cookie_name,
        value=session.refresh_token,
        max_age=max(0, session.refresh_expires_at - now),
        **kwargs,
    )


def clear_sso_cookies(response: Response) -> None:
    kwargs = _cookie_kwargs()
    for key in (auth_settings.auth_cookie_name, auth_settings.auth_refresh_cookie_name):
        response.delete_cookie(key=key, **kwargs)
