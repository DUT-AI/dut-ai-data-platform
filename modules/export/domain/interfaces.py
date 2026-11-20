from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass
from typing import Any, BinaryIO, Protocol

from modules.export.domain.entities import ExportItemEntity, ExportPackageEntity
from modules.export.domain.value_objects import (
    ExportFormatType,
    ExportStatus,
    MediaMode,
)


@dataclass
class SnapshotAssetInfo:
    asset_id: str
    uri: str
    sha256: str
    data_format: str
    file_size_bytes: int = 0


@dataclass
class SnapshotAnnotationInfo:
    revision_id: str
    results: list[dict[str, Any]]
    category_ids: list[str]
    source: str = "human"


@dataclass
class SnapshotItemExportData:
    asset_id: str
    annotation_revision_id: str | None
    split: str
    item_checksum: str
    asset: SnapshotAssetInfo
    annotation: SnapshotAnnotationInfo | None


@dataclass
class OntologyCategoryInfo:
    id: str
    key: str
    name: str
    color: str | None = None


@dataclass
class OntologyOutputInfo:
    id: str
    name: str
    definition_code: str  # e.g., 'rectanglelabels', 'choices', 'textarea'
    categories: list[OntologyCategoryInfo]


@dataclass
class SnapshotExportContext:
    snapshot_id: str
    project_id: str
    version_name: str
    dataset_version_id: str
    ontology_version_id: str
    outputs: list[OntologyOutputInfo]
    categories: list[OntologyCategoryInfo]
    total_items: int


class IExportPackageRepository(Protocol):
    async def create(self, package: ExportPackageEntity) -> ExportPackageEntity:
        """Persist a new export package."""
        ...

    async def get_by_id(self, package_id: str) -> ExportPackageEntity | None:
        """Fetch export package by ULID."""
        ...

    async def get_by_idempotency(
        self,
        snapshot_id: str,
        format_type: ExportFormatType,
        target_output_id: str | None,
        media_mode: MediaMode,
        annotated_only: bool,
    ) -> ExportPackageEntity | None:
        """Find existing export package by idempotency key."""
        ...

    async def list_by_project(
        self,
        project_id: str,
        snapshot_id: str | None = None,
        status: ExportStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[Sequence[ExportPackageEntity], int]:
        """List export packages for a project with optional filters and total count."""
        ...

    async def update(self, package: ExportPackageEntity) -> ExportPackageEntity:
        """Update package status, storage_uri, checksum, item_count, error."""
        ...

    async def delete(self, package_id: str) -> bool:
        """Hard delete package and cascade items."""
        ...


class IExportItemRepository(Protocol):
    async def bulk_create(self, items: Sequence[ExportItemEntity]) -> int:
        """Batch insert export items."""
        ...

    async def list_by_package(
        self,
        package_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[ExportItemEntity]:
        """List lineage items for an export package."""
        ...

    async def count_by_package(self, package_id: str) -> int:
        """Count items in an export package."""
        ...


class ISnapshotGateway(Protocol):
    async def get_export_context(self, snapshot_id: str) -> SnapshotExportContext:
        """Fetch snapshot metadata, ontology schema, outputs and categories."""
        ...

    def stream_snapshot_items(
        self,
        snapshot_id: str,
        annotated_only: bool = False,
    ) -> AsyncIterator[SnapshotItemExportData]:
        """Iterate through all snapshot items with asset and annotation revision data."""
        ...

    async def get_asset_stream(self, uri: str) -> BinaryIO:
        """Fetch asset binary stream from storage."""
        ...


class IStorageGateway(Protocol):
    async def upload_package(
        self,
        project_id: str,
        package_id: str,
        file_path_or_stream: Any,
        content_type: str = "application/zip",
    ) -> str:
        """Upload zip archive and return storage URI."""
        ...

    async def get_presigned_download_url(
        self,
        storage_uri: str,
        expires_seconds: int = 1800,
    ) -> str:
        """Generate a 30-minute presigned GET URL."""
        ...

    async def delete_package(self, storage_uri: str) -> bool:
        """Delete zip archive from object storage."""
        ...
