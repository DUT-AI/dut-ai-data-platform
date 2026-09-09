from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from core.config import s3_settings
from core.storage.url_builder import build_storage_public_url


class DatasetCreateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    tags: list[str] | None = None


class DatasetUpdateDTO(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    tags: list[str] | None = None


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
    data_format: str | None = None
    status: str = "READY"
    provenance: dict[str, Any] | None = None
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    retired_at: datetime | None = None

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
    version_number: int | None = None
    version_label: str | None = None
    parent_version_id: str | None = None
    status: str
    version_config: dict[str, Any] | None = None
    manifest_hash: str | None = None
    asset_count: int
    created_by: str | None = None
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
    tags: list[str] = Field(default_factory=list)
    status: str
    latest_published_version_number: int | None = None
    created_by: str | None = None
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


class PrepareUploadItemDTO(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str | None = None


class PrepareUploadRequestDTO(BaseModel):
    files: list[PrepareUploadItemDTO] = Field(..., min_length=1)


class PresignedUploadUrlItemDTO(BaseModel):
    filename: str
    asset_id: str
    storage_key: str
    upload_url: str
    expires_in_seconds: int


class PrepareUploadResponseDTO(BaseModel):
    items: list[PresignedUploadUrlItemDTO]


class FinalizeAssetImportItemDTO(BaseModel):
    asset_id: str
    filename: str
    storage_key: str
    sha256: str
    file_size: int = Field(..., ge=0)
    mime_type: str
    metadata: dict[str, Any] | None = None
    data_format: str | None = None
    provenance: dict[str, Any] | None = None


class FinalizeAssetImportRequestDTO(BaseModel):
    items: list[FinalizeAssetImportItemDTO] = Field(..., min_length=1)


class FinalizeAssetImportResponseDTO(BaseModel):
    imported_assets: list[AssetResponseDTO]


class CursorPageAssetResponseDTO(BaseModel):
    items: list[AssetResponseDTO]
    next_cursor: str | None = None


class InheritDatasetVersionRequestDTO(BaseModel):
    source_version_id: str = Field(..., min_length=1)


class InheritDatasetVersionResponseDTO(BaseModel):
    target_version_id: str
    source_version_id: str
    added_assets_count: int
    reused_assets_count: int
    total_assets_count: int

