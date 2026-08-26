from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class DatabaseSettings(BaseSettings):
    """PostgreSQL Database Configuration."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    database_url: str = (
        "postgresql+asyncpg://platform:platform_dev@localhost:5432/ai_data_platform"
    )
    db_echo: bool = False

    @property
    def url(self) -> str:
        return self.database_url

    @property
    def echo(self) -> bool:
        return self.db_echo
