from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from core.utils.id_generator import generate_ulid
from modules.export.domain.exceptions import ExportPackageImmutableError
from modules.export.domain.value_objects import (
    ExportFormatType,
    ExportStatus,
    MediaMode,
)


@dataclass
class ExportItemEntity:
    id: str = field(default_factory=generate_ulid)
    export_package_id: str = ""
    source_asset_id: str = ""
    source_annotation_revision_id: str | None = None
    target_path: str = ""
    split: str = "default"
    checksum: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ExportPackageEntity:
    project_id: str
    snapshot_id: str
    format: ExportFormatType
    created_by: int
    target_output_id: str | None = None
    media_mode: MediaMode = MediaMode.LABELS_ONLY
    annotated_only: bool = False
    id: str = field(default_factory=generate_ulid)
    status: ExportStatus = ExportStatus.PROCESSING
    storage_uri: str | None = None
    checksum: str | None = None
    file_size_bytes: int | None = None
    item_count: int = 0
    error_code: str | None = None
    error_message: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    finalized_at: datetime | None = None

    def mark_ready(
        self,
        storage_uri: str,
        checksum: str,
        file_size_bytes: int,
        item_count: int,
        finalized_at: datetime | None = None,
    ) -> None:
        if self.status != ExportStatus.PROCESSING:
            raise ExportPackageImmutableError(
                f"Cannot mark ready export package from status {self.status.value}"
            )
        self.status = ExportStatus.READY
        self.storage_uri = storage_uri
        self.checksum = checksum
        self.file_size_bytes = file_size_bytes
        self.item_count = item_count
        self.finalized_at = finalized_at or datetime.now(UTC)

    def mark_failed(
        self,
        error_code: str,
        error_message: str,
        finalized_at: datetime | None = None,
    ) -> None:
        if self.status != ExportStatus.PROCESSING:
            raise ExportPackageImmutableError(
                f"Cannot mark failed export package from status {self.status.value}"
            )
        self.status = ExportStatus.FAILED
        self.error_code = error_code
        self.error_message = error_message
        self.finalized_at = finalized_at or datetime.now(UTC)
