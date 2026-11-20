"""Map verified DUT AI SSO claims to the platform AuthUser."""

from typing import Any

from core.exceptions import UnauthorizedException
from modules.identity.dtos.auth_dtos import AuthUser


def auth_user_from_claims(claims: dict[str, Any]) -> AuthUser:
    """Build AuthUser from Manage claims (`sub`, `name`, `email`, `roles`, `avatar`)."""
    try:
        user_id = int(claims["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise UnauthorizedException(
            "Token subject (sub) is not an integer user id"
        ) from exc
    if user_id <= 0:
        raise UnauthorizedException("Token subject (sub) must be a positive integer")

    return AuthUser(
        id=user_id,
        name=claims.get("name") or "",
        email=claims.get("email") or "",
        status="ACTIVE",
        avatar_url=claims.get("avatar") or None,
        role_names=list(claims.get("roles") or []),
    )
