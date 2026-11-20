from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class AuthSettings(BaseSettings):
    """DUT AI SSO settings.

    DUT AI Manage issues every token. The Data Platform only verifies Manage
    access tokens with the shared secret and never mints its own.
    """

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # MUST equal DUT AI Manage `SECRET_KEY` (workspace spec name: SHARED_JWT_SECRET).
    jwt_secret_key: str = "change-this-to-a-very-secure-secret-key-in-production"
    jwt_algorithm: str = "HS256"

    # Shared SSO cookies written by DUT AI Manage.
    auth_cookie_name: str = "access_token"
    auth_refresh_cookie_name: str = "refresh_token"
    auth_cookie_domain: str | None = None
    auth_cookie_secure: bool = False
    auth_cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    # Local development only: email/password login proxied to DUT AI Manage.
    auth_local_login_enabled: bool = False

    # DUT AI Manage auth server (local login + default base of the Manage API).
    auth_server_url: str = "http://localhost:8000/api/v1/auth/login"
    api_time_out: float = 10.0

    # Minimum minutes between two last_login_at writes for the same user.
    activity_record_interval_minutes: int = 15

    @field_validator("auth_cookie_domain", mode="before")
    @classmethod
    def _blank_domain_is_none(cls, value: str | None) -> str | None:
        if value is None or not str(value).strip():
            return None
        return str(value).strip()

    @property
    def login_url(self) -> str:
        url = self.auth_server_url.rstrip("/")
        if url.endswith(("/auth/login", "/login")):
            return url
        return f"{url}/auth/login"


auth_settings = AuthSettings()
