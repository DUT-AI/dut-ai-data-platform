from datetime import datetime

from pydantic import BaseModel, ConfigDict

from modules.export.domain.entities import ExportPackageEntity
from modules.export.domain.value_objects import (
    ExportFormatType,
    MediaMode,
)


class ExportCreateRequest(BaseModel):
    format: ExportFormatType
    target_output_id: str | None = None
    media_mode: MediaMode = MediaMode.LABELS_ONLY
    annotated_only: bool = False

    model_config = ConfigDict(from_attributes=True)


class ExportPackageResponse(BaseModel):
    id: str
    project_id: str
    snapshot_id: str
    format: str
    target_output_id: str | None = None
    media_mode: str
    annotated_only: bool
    status: str
    storage_uri: str | None = None
    checksum: str | None = None
    file_size_bytes: int | None = None
    item_count: int
    error_code: str | None = None
    error_message: str | None = None
    created_by: int
    created_at: datetime
    finalized_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_entity(cls, entity: ExportPackageEntity) -> "ExportPackageResponse":
        return cls(
            id=entity.id,
            project_id=entity.project_id,
            snapshot_id=entity.snapshot_id,
            format=entity.format.value
            if hasattr(entity.format, "value")
            else str(entity.format),
            target_output_id=entity.target_output_id,
            media_mode=entity.media_mode.value
            if hasattr(entity.media_mode, "value")
            else str(entity.media_mode),
            annotated_only=entity.annotated_only,
            status=entity.status.value
            if hasattr(entity.status, "value")
            else str(entity.status),
            storage_uri=entity.storage_uri,
            checksum=entity.checksum,
            file_size_bytes=entity.file_size_bytes,
            item_count=entity.item_count,
            error_code=entity.error_code,
            error_message=entity.error_message,
            created_by=entity.created_by,
            created_at=entity.created_at,
            finalized_at=entity.finalized_at,
        )


class ExportDownloadResponse(BaseModel):
    download_url: str
    expires_in_seconds: int = 1800
