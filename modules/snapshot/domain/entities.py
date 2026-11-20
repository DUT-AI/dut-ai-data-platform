from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from core.utils.id_generator import generate_ulid
from modules.snapshot.domain.exceptions import SnapshotImmutableError
from modules.snapshot.domain.value_objects import (
    SelectionPolicy,
    SnapshotStatus,
    SplitRatios,
    SplitStrategy,
    SplitType,
)


@dataclass
class SnapshotEntity:
    project_id: str
    dataset_version_id: str
    ontology_version_id: str
    version_name: str
    created_by: int
    id: str = field(default_factory=generate_ulid)
    status: SnapshotStatus = "CREATING"
    selection_policy: SelectionPolicy = "LATEST_APPROVED"
    include_unannotated: bool = False
    split_strategy: SplitStrategy = "STRATIFIED"
    split_ratios: SplitRatios = field(default_factory=SplitRatios)
    split_seed: int | None = None
    error_code: str | None = None
    error_message: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    finalized_at: datetime | None = None
    archived_at: datetime | None = None

    def mark_ready(self, finalized_at: datetime | None = None) -> None:
        if self.status != SnapshotStatus.CREATING:
            raise SnapshotImmutableError(
                f"Cannot finalize snapshot from status {self.status}"
            )
        self.status = SnapshotStatus.READY
        self.finalized_at = finalized_at or datetime.now(UTC)

    def mark_failed(self, error_code: str, error_message: str) -> None:
        if self.status not in (SnapshotStatus.CREATING, SnapshotStatus.READY):
            raise SnapshotImmutableError(
                f"Cannot transition to FAILED from status {self.status}"
            )
        self.status = SnapshotStatus.FAILED
        self.error_code = error_code
        self.error_message = error_message

    def archive(self, archived_at: datetime | None = None) -> None:
        if self.status != SnapshotStatus.READY:
            raise SnapshotImmutableError(
                f"Only READY snapshots can be archived (current: {self.status.value})"
            )
        self.status = SnapshotStatus.ARCHIVED
        self.archived_at = archived_at or datetime.now(UTC)

    def assert_mutable(self) -> None:
        if self.status in ("READY", "ARCHIVED"):
            raise SnapshotImmutableError(
                f"Snapshot {self.id} is immutable in status {self.status}"
            )


@dataclass
class SnapshotItemEntity:
    snapshot_id: str
    asset_id: str
    split: SplitType
    item_checksum: str
    id: str = field(default_factory=generate_ulid)
    annotation_revision_id: str | None = None
    sort_order: int = 0
    created_at: datetime | None = None


@dataclass
class SnapshotManifestEntity:
    snapshot_id: str
    dataset_version_id: str
    ontology_version_id: str
    asset_count: int
    annotation_count: int
    split_distribution: dict[str, Any]
    class_distribution: dict[str, Any]
    aggregate_checksum: str
    storage_uri: str
    id: str = field(default_factory=generate_ulid)
    created_at: datetime | None = None


@dataclass
class ReleaseTagEntity:
    project_id: str
    snapshot_id: str
    name: str
    created_by: int
    id: str = field(default_factory=generate_ulid)
    created_at: datetime | None = None
    updated_at: datetime | None = None
