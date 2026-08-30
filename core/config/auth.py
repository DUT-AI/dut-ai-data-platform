from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class AuthSettings(BaseSettings):
    """Auth Configuration."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Security & JWT
    jwt_secret_key: str = "change-this-to-a-very-secure-secret-key-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # Cookie Authentication
    auth_cookie_name: str = "access_token"
    auth_cookie_secure: bool = False
    auth_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    auth_cookie_max_age: int = 86400

    # Auth Server
    auth_server_url: str = "http://localhost:8000/api/v1/auth/login"
    get_me_url: str = "http://localhost:8000/api/v1/auth/me"
    api_time_out: float = 10.0


auth_settings = AuthSettings()
