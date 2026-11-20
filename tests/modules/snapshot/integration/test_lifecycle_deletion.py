from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from modules.snapshot.application.use_cases.archive_snapshot import (
    ArchiveSnapshotUseCase,
)
from modules.snapshot.application.use_cases.purge_snapshot import (
    PurgeSnapshotUseCase,
)
from modules.snapshot.domain.entities import (
    SnapshotEntity,
    SnapshotManifestEntity,
)
from modules.snapshot.domain.value_objects import (
    SelectionPolicy,
    SnapshotStatus,
    SplitRatios,
    SplitStrategy,
)


@pytest.fixture
def ready_snapshot():
    return SnapshotEntity(
        id="snap-ready",
        project_id="proj-1",
        dataset_version_id="ds-v1",
        ontology_version_id="ont-v1",
        version_name="v1.0.0",
        status=SnapshotStatus.READY,
        selection_policy=SelectionPolicy.LATEST_APPROVED,
        include_unannotated=False,
        split_strategy=SplitStrategy.STRATIFIED,
        split_ratios=SplitRatios(0.7, 0.15, 0.15),
        created_by=1001,
        created_at=datetime.now(UTC),
    )


@pytest.mark.asyncio
async def test_archive_snapshot_lifecycle(ready_snapshot):
    snapshot_repo = MagicMock()
    snapshot_repo.get_by_id = AsyncMock(return_value=ready_snapshot)
    snapshot_repo.update = AsyncMock(side_effect=lambda s: s)

    use_case = ArchiveSnapshotUseCase(snapshot_repo)
    archived = await use_case.execute("proj-1", "snap-ready")

    assert archived.status == SnapshotStatus.ARCHIVED
    assert archived.archived_at is not None
    snapshot_repo.update.assert_called_once()


@pytest.mark.asyncio
async def test_purge_snapshot_lifecycle(ready_snapshot):
    snapshot_repo = MagicMock()
    snapshot_repo.get_by_id = AsyncMock(return_value=ready_snapshot)
    snapshot_repo.delete_permanent = AsyncMock(return_value=True)

    manifest_repo = MagicMock()
    manifest_repo.get_by_snapshot_id = AsyncMock(
        return_value=SnapshotManifestEntity(
            id="man-1",
            snapshot_id="snap-ready",
            dataset_version_id="ds-v1",
            ontology_version_id="ont-v1",
            asset_count=100,
            annotation_count=100,
            split_distribution={},
            class_distribution={},
            aggregate_checksum="chk",
            storage_uri="s3://ai-data-platform/projects/proj-1/snapshots/snap-ready/manifest.json",
        )
    )

    storage_gateway = MagicMock()
    storage_gateway.delete_object = AsyncMock(return_value=True)

    use_case = PurgeSnapshotUseCase(
        snapshot_repo=snapshot_repo,
        manifest_repo=manifest_repo,
        storage_gateway=storage_gateway,
    )

    success = await use_case.execute("proj-1", "snap-ready")
    assert success is True
    storage_gateway.delete_object.assert_called_once_with(
        "s3://ai-data-platform/projects/proj-1/snapshots/snap-ready/manifest.json"
    )
    snapshot_repo.delete_permanent.assert_called_once_with("snap-ready")
