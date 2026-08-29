from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class AppSettings(BaseSettings):
    """Application & Server Configuration."""

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
    auth_cookie_samesite: str = "lax"
    auth_cookie_max_age: int = 86400

    # Auth & Manage Server
    auth_server_url: str = "http://localhost:8000/api/v1"
    manage_server_url: str = "http://localhost:8000/api/v1"
    manage_api_token: str | None = None
    external_api_timeout: float = 10.0

    # Server configs
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000"

    # Telemetry
    otel_exporter_otlp_endpoint: str | None = None

    # Label Studio
    label_studio_url: str = "http://localhost:8080"
    label_studio_internal_url: str = "http://localhost:8080"
    label_studio_api_key: str = ""
    platform_webhook_url: str = (
        "http://host.docker.internal:8000/api/v1/annotations/sync"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]
