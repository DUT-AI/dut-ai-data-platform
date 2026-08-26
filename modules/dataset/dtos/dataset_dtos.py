from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from core.config import s3_settings
from core.storage.url_builder import build_storage_public_url


class DatasetCreateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None


class AssetResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    filename: str
    uri: str
    mime_type: str
    file_size: int
    sha256: str
    metadata: dict[str, Any] | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @field_validator("uri", mode="after")
    @classmethod
    def resolve_full_uri(cls, v: str) -> str:
        if not v:
            return v
        return build_storage_public_url(v, s3_settings.public_minio_endpoint)


class DatasetVersionResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    dataset_id: str
    version: str
    status: str
    asset_count: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
    published_at: datetime | None = None
    assets: list[AssetResponseDTO] = Field(default_factory=list)


class DatasetResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    name: str
    description: str | None = None
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    versions: list[DatasetVersionResponseDTO] = Field(default_factory=list)


class DatasetVersionCreateDTO(BaseModel):
    version: str = Field(..., min_length=1, max_length=50)


class BatchUploadResultDTO(BaseModel):
    uploaded_assets: list[AssetResponseDTO]
    reused_assets_count: int
    new_assets_count: int


class AssetDownloadUrlResponseDTO(BaseModel):
    asset_id: str
    filename: str
    download_url: str
    expires_in_seconds: int
