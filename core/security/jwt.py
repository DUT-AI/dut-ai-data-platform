"""Internal JWT utilities for signing/verifying internal platform tokens.

NOTE: Authentication in DUT AI Data Platform delegates to the External Auth Server
as the single Source of Truth (via AuthClient.get_me). This module is reserved for
any local internal signing tasks and is NOT used to verify external auth tokens.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from jwt.exceptions import InvalidTokenError

from core.config import settings
from core.exceptions import UnauthorizedException


def create_access_token(
    data: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    """Encode payload dictionary into signed internal JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except InvalidTokenError as e:
        raise UnauthorizedException(
            f"Invalid or expired authentication token: {e}"
        ) from e
