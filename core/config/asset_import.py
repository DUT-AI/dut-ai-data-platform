from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class AssetImportSettings(BaseSettings):
    """Asynchronous asset import: Redis queue + validation workers."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Namespaced: the Redis instance may be shared with other DUT AI services.
    asset_import_queue_name: str = "dutdp:asset-import"
    asset_import_key_prefix: str = "dutdp:"

    # Number of validation worker processes (docker compose replicas).
    asset_import_workers: int = Field(4, ge=1)
    asset_import_job_timeout_seconds: int = Field(900, ge=10)
    # Attempts for infrastructure errors (data errors never retry).
    asset_import_max_tries: int = Field(3, ge=1)
    asset_import_job_ttl_seconds: int = Field(86400, ge=60)
    asset_import_max_items: int = Field(500, ge=1)
    asset_import_max_file_bytes: int = Field(500 * 1024 * 1024, ge=1)

    # Delay before attempt N+1 (index N-1); the last value repeats.
    asset_import_retry_backoff_seconds: tuple[int, ...] = (5, 30, 120)

    @property
    def max_processing_seconds(self) -> int:
        """Longest time a job can keep its objects without asset rows:
        every attempt running to the timeout, plus every retry delay."""
        tries = self.asset_import_max_tries
        delays = sum(self.retry_delay(attempt) for attempt in range(1, tries))
        return tries * self.asset_import_job_timeout_seconds + delays

    def retry_delay(self, attempt: int) -> int:
        backoff = self.asset_import_retry_backoff_seconds or (5,)
        return backoff[min(attempt, len(backoff)) - 1]
