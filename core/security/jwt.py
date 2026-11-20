"""DUT AI SSO token verification.

Tokens are issued by DUT AI Manage (HS256, shared secret). The Data Platform
only verifies them and never mints tokens.
"""

from typing import Any

import jwt
from jwt.exceptions import InvalidTokenError

from core.config.auth import auth_settings
from core.exceptions import UnauthorizedException

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def decode_sso_token(token: str, expected_type: str) -> dict[str, Any]:
    """Verify signature, `exp`, `sub` and the Manage `type` claim."""
    try:
        payload = jwt.decode(
            token,
            auth_settings.jwt_secret_key,
            algorithms=[auth_settings.jwt_algorithm],
            options={"require": ["exp", "sub"]},
        )
    except InvalidTokenError as e:
        raise UnauthorizedException(
            f"Invalid or expired authentication token: {e}"
        ) from e

    if payload.get("type") != expected_type:
        raise UnauthorizedException(f"Token is not an SSO {expected_type} token")
    return payload


def decode_access_token(token: str) -> dict[str, Any]:
    """Verify a DUT AI SSO access token."""
    return decode_sso_token(token, ACCESS_TOKEN_TYPE)
