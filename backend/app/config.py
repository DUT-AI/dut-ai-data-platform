from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

API_DIR = Path(__file__).resolve().parent
BACKEND_DIR = API_DIR.parent
ROOT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            BACKEND_DIR / ".env",
            ROOT_DIR / ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Database
    database_url: str = (
        "postgresql+asyncpg://platform:platform_dev@localhost:5432/ai_data_platform"
    )
    db_echo: bool = False

    # Redis Cache & Broker
    redis_url: str = "redis://localhost:6379/0"

    # Security & JWT
    jwt_secret_key: str = "change-this-to-a-very-secure-secret-key-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # Auth Server
    auth_server_url: str = "https://manage.dutai.site/api/v1"

    # Server configs
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000,http://localhost:8000"

    # S3 / MinIO Storage
    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_secure: bool = False
    default_bucket: str = "ai-data-platform"

    # Label Studio
    # URL mà browser user truy cập (hiển thị cho user)
    label_studio_url: str = "http://localhost:8080"
    # URL mà backend API gọi đến LS (từ host machine hoặc docker network)
    label_studio_internal_url: str = "http://localhost:8080"
    # Legacy Token: lấy từ LS > Account & Settings > Access Token (tab Legacy Token)
    # Dùng header: Authorization: Token <api_key>  (KHÔNG phải Bearer)
    label_studio_api_key: str = ""
    # URL mà LS container gọi webhook về (phải reachable từ trong Docker)
    # macOS/Windows: http://host.docker.internal:8000
    # Linux: http://172.17.0.1:8000 hoặc IP bridge network
    platform_webhook_url: str = (
        "http://host.docker.internal:8000/api/v1/annotations/sync"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]


settings = Settings()
