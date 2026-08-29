from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class ManageSettings(BaseSettings):
    """Auth Configuration."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Auth Server
    user_endpoint: str = "http://localhost:8000/api/v1/auth/users"
    manage_api_token: str = ""
    api_timeout: float = 10.0


manage_settings = ManageSettings()
