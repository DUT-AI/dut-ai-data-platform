from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


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
