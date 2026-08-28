from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class S3Settings(BaseSettings):
    """S3 / MinIO Storage Configuration."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    minio_endpoint: str = "https://dataplatforms3.dutai.io.vn"
    minio_access_key: str = ""
    minio_secret_key: str = ""
    minio_secure: bool = False
    default_bucket: str = "ai-data-platform"
    minio_public_endpoint: str | None = None

    @property
    def public_minio_endpoint(self) -> str:
        return (self.minio_public_endpoint or self.minio_endpoint).rstrip("/")

    @property
    def is_secure(self) -> bool:
        return self.minio_secure or self.minio_endpoint.startswith("https://")
