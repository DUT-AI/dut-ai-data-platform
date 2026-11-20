"""Mint tokens shaped exactly like DUT AI Manage (backend/app/utils/password.py)."""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from core.config.auth import auth_settings


def mint_manage_token(
    user_id: int | str = 101,
    *,
    token_type: str = "access",
    name: str = "Alice",
    email: str = "alice@example.com",
    roles: list[str] | None = None,
    avatar: str = "",
    expires_in: timedelta = timedelta(hours=1),
    secret: str | None = None,
) -> str:
    claims: dict[str, Any] = {
        "exp": int((datetime.now(UTC) + expires_in).timestamp()),
        "type": token_type,
        "sub": str(user_id),
        "user_id": user_id,
        "name": name,
        "email": email,
        "roles": roles if roles is not None else ["Admin"],
        "avatar": avatar,
        "permissions": [],
    }
    return jwt.encode(claims, secret or auth_settings.jwt_secret_key, algorithm="HS256")
