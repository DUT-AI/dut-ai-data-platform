from dataclasses import dataclass
from datetime import datetime
from typing import Any

from modules.identity.dtos.auth_dtos import AuthUser, TokenResponse


@dataclass
class UserEntity:
    """Core domain user entity representing identity in the Data Platform."""

    id: int
    email: str
    name: str | None = None
    role: str = "user"
    password_hash: str | None = None
    avatar_url: str | None = None
    status: str = "ACTIVE"
    created_at: datetime | None = None


@dataclass
class AuthPayload:
    user_id: int
    email: str | None = None
    role: str = "user"
    raw_payload: dict[str, Any] | None = None


@dataclass
class UserLoginMetadataEntity:
    """Domain entity representing a user's last login record in Data Platform."""

    user_id: int
    last_login_at: datetime
    created_at: datetime | None = None
    updated_at: datetime | None = None


__all__ = [
    "AuthPayload",
    "AuthUser",
    "TokenResponse",
    "UserEntity",
    "UserLoginMetadataEntity",
]
