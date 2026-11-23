from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any, Protocol

from modules.snapshot.domain.entities import (
    ReleaseTagEntity,
    SnapshotEntity,
    SnapshotItemEntity,
    SnapshotManifestEntity,
)
from modules.snapshot.domain.value_objects import SnapshotStatus, SplitRatios


class SnapshotRepository(Protocol):
    async def create(self, snapshot: SnapshotEntity) -> SnapshotEntity:
        """Persist a new Snapshot record."""
        ...

    async def get_by_id(self, snapshot_id: str) -> SnapshotEntity | None:
        """Fetch snapshot by ULID."""
        ...

    async def get_by_project_and_version(
        self, project_id: str, version_name: str
    ) -> SnapshotEntity | None:
        """Fetch snapshot by project and version name."""
        ...

    async def list_by_project(
        self,
        project_id: str,
        status: SnapshotStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[SnapshotEntity]:
        """List snapshots for a project with optional status filter."""
        ...

    async def update(self, snapshot: SnapshotEntity) -> SnapshotEntity:
        """Update snapshot status, timestamps, or error details."""
        ...

    async def delete_permanent(self, snapshot_id: str) -> bool:
        """Hard delete snapshot and cascade items/manifests (Owner only)."""
        ...

    async def count_by_project(self, project_id: str) -> int:
        """Get total snapshot count in project for auto-version generation."""
        ...


class SnapshotItemRepository(Protocol):
    async def bulk_create(self, items: Sequence[SnapshotItemEntity]) -> int:
        """Efficiently batch insert snapshot items."""
        ...

    async def list_by_snapshot_keyset(
        self,
        snapshot_id: str,
        cursor: str | None = None,
        limit: int = 100,
        split: str | None = None,
    ) -> tuple[Sequence[SnapshotItemEntity], str | None]:
        """Fetch page of items using keyset pagination (id > cursor). Returns (items, next_cursor)."""
        ...

    async def list_by_snapshot_offset(
        self,
        snapshot_id: str,
        limit: int = 100,
        offset: int = 0,
        split: str | None = None,
    ) -> Sequence[SnapshotItemEntity]:
        """Fetch items using standard offset pagination for UI."""
        ...

    async def count_by_snapshot(
        self, snapshot_id: str, split: str | None = None
    ) -> int:
        """Count items in a snapshot, optionally filtered by split."""
        ...

    async def delete_by_snapshot(self, snapshot_id: str) -> int:
        """Purge items when rolling back a failed/cancelled snapshot."""
        ...


class SnapshotManifestRepository(Protocol):
    async def create(self, manifest: SnapshotManifestEntity) -> SnapshotManifestEntity:
        """Store relational manifest record."""
        ...

    async def get_by_snapshot_id(
        self, snapshot_id: str
    ) -> SnapshotManifestEntity | None:
        """Fetch manifest metadata for a snapshot."""
        ...


class ReleaseTagRepository(Protocol):
    async def upsert(self, tag: ReleaseTagEntity) -> ReleaseTagEntity:
        """Assign or reassign release tag to a snapshot in project."""
        ...

    async def get_by_project_and_name(
        self, project_id: str, name: str
    ) -> ReleaseTagEntity | None:
        """Find tag by project and name."""
        ...

    async def list_by_project(self, project_id: str) -> Sequence[ReleaseTagEntity]:
        """List all release tags in a project."""
        ...

    async def delete(self, project_id: str, name: str) -> bool:
        """Remove a release tag."""
        ...


# --- Upstream Gateways ---


@dataclass(frozen=True)
class DatasetAssetInfo:
    asset_id: str
    sha256: str
    uri: str
    data_format: str | None = None


@dataclass(frozen=True)
class ResolvedAnnotationInfo:
    annotation_revision_id: str
    asset_id: str
    labels: list[str]
    revision_sha256: str


class DatasetGateway(Protocol):
    async def get_version_assets(
        self, dataset_version_id: str
    ) -> Sequence[DatasetAssetInfo]:
        """Fetch all asset references belonging to a dataset version."""
        ...

    async def has_active_snapshot_references(self, asset_id: str) -> bool:
        """Check if an asset is pinned by any READY/ARCHIVED snapshot (Referential Guard)."""
        ...


class AnnotationGateway(Protocol):
    async def resolve_revisions(
        self,
        asset_ids: Sequence[str],
        policy: str,
    ) -> dict[str, ResolvedAnnotationInfo | None]:
        """Resolve latest approved or latest submitted revision for assets."""
        ...


class OntologyGateway(Protocol):
    async def validate_revisions(
        self,
        ontology_version_id: str,
        revision_ids: Sequence[str],
    ) -> tuple[bool, list[str]]:
        """Validate that all annotations strictly conform to ontology. Returns (is_valid, violation_errors)."""
        ...


class StorageGateway(Protocol):
    async def upload_manifest(self, path: str, content: bytes) -> str:
        """Upload canonical manifest JSON to S3/MinIO and return storage URI."""
        ...

    async def delete_object(self, uri: str) -> bool:
        """Purge manifest file from S3 on hard deletion."""
        ...


class SnapshotJobLauncher(Protocol):
    def launch(self, snapshot_id: str) -> None:
        """Start building a committed CREATING snapshot in the background."""
        ...


# --- Pure Domain Services Protocols ---


class ChecksumService(Protocol):
    def compute_item_checksum(
        self,
        asset_id: str,
        asset_checksum: str,
        annotation_revision_id: str | None,
        split: str,
    ) -> str:
        """Compute deterministic SHA-256 hash over canonical JSON."""
        ...

    def compute_aggregate_checksum(self, item_checksums: Sequence[str]) -> str:
        """Compute SHA-256 digest over lexicographically sorted list of item checksums."""
        ...


class StratificationService(Protocol):
    def partition(
        self,
        items: Sequence[dict[str, Any]],
        strategy: str,
        ratios: SplitRatios,
        seed: int | None = None,
    ) -> dict[str, str]:
        """Assign each asset_id to 'train', 'validation', or 'test'."""
        ...


class SnapshotDiffService(Protocol):
    async def calculate_diff_summary(
        self,
        base_snapshot_id: str,
        target_snapshot_id: str,
    ) -> dict[str, Any]:
        """Calculate high-level KPI diff (added, removed, modified, split movements, class deltas)."""
        ...

    async def list_diff_items(
        self,
        base_snapshot_id: str,
        target_snapshot_id: str,
        change_type: str,
        cursor: str | None = None,
        limit: int = 100,
    ) -> tuple[Sequence[dict[str, Any]], str | None]:
        """List individual item deltas with keyset pagination."""
        ...
