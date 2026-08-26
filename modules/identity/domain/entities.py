from dataclasses import dataclass
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


@dataclass
class UserEntity:
    email: str
    role: str
    password_hash: str
    id: int | None = None
    name: str | None = None
    avatar_url: str | None = None
    created_at: datetime | None = None


@dataclass
class AuthPayload:
    user_id: str
    email: str | None = None
    role: str = "user"
    raw_payload: dict[str, Any] | None = None


class AuthUser(BaseModel):
    """User profile model parsed from Auth Server."""

    id: int
    name: str
    email: str
    status: str = "ACTIVE"
    avatar_url: str | None = None
    role_names: list[str] = Field(default_factory=list)


class TokenResponse(BaseModel):
    """Token payload returned upon successful login."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
