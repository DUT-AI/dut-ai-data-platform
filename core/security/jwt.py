"""DUT AI Data Platform JWT Token Infrastructure.

Responsible for generating, signing, and verifying Data Platform's own access tokens.
Manage Server is only used for initial credential validation and identity resolution.
Once authenticated, Data Platform issues its own JWT signed with the platform secret.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from jwt.exceptions import InvalidTokenError

from core.config.auth import auth_settings
from core.exceptions import UnauthorizedException


def create_access_token(
    data: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    """Encode payload dictionary into signed DUT AI Data Platform JWT access token."""
    to_encode = data.copy()
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=auth_settings.jwt_expire_minutes)

    to_encode.update(
        {
            "iat": int(now.timestamp()),
            "exp": int(expire.timestamp()),
            "iss": "dut-ai-data-platform",
        }
    )
    encoded_jwt = jwt.encode(
        to_encode, auth_settings.jwt_secret_key, algorithm=auth_settings.jwt_algorithm
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify DUT AI Data Platform JWT access token."""
    try:
        payload = jwt.decode(
            token,
            auth_settings.jwt_secret_key,
            algorithms=[auth_settings.jwt_algorithm],
            options={"require": ["exp", "sub"]},
        )
        return payload
    except InvalidTokenError as e:
        raise UnauthorizedException(
            f"Invalid or expired authentication token: {e}"
        ) from e
