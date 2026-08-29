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
