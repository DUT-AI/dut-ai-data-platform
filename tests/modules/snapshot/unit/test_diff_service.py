from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from modules.snapshot.application.use_cases.diff_snapshots import (
    DiffSnapshotsUseCase,
)
from modules.snapshot.domain.entities import SnapshotEntity
from modules.snapshot.domain.value_objects import (
    SelectionPolicy,
    SnapshotStatus,
    SplitRatios,
    SplitStrategy,
)


@pytest.fixture
def ready_snapshot_a():
    return SnapshotEntity(
        id="snap-A",
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


@pytest.fixture
def ready_snapshot_b():
    return SnapshotEntity(
        id="snap-B",
        project_id="proj-1",
        dataset_version_id="ds-v2",
        ontology_version_id="ont-v1",
        version_name="v2.0.0",
        status=SnapshotStatus.READY,
        selection_policy=SelectionPolicy.LATEST_APPROVED,
        include_unannotated=False,
        split_strategy=SplitStrategy.STRATIFIED,
        split_ratios=SplitRatios(0.7, 0.15, 0.15),
        created_by=1001,
        created_at=datetime.now(UTC),
    )


@pytest.mark.asyncio
async def test_diff_summary_success(ready_snapshot_a, ready_snapshot_b):
    snapshot_repo = MagicMock()
    snapshot_repo.get_by_id = AsyncMock(
        side_effect=lambda sid: (
            ready_snapshot_a
            if sid == "snap-A"
            else ready_snapshot_b
            if sid == "snap-B"
            else None
        )
    )

    diff_service = MagicMock()
    diff_service.calculate_diff_summary = AsyncMock(
        return_value={
            "base_snapshot_id": "snap-A",
            "target_snapshot_id": "snap-B",
            "added_asset_count": 10,
            "removed_asset_count": 2,
            "modified_annotation_count": 5,
            "split_movement_count": 1,
            "class_distribution_deltas": {"car": 8, "pedestrian": -2},
        }
    )

    use_case = DiffSnapshotsUseCase(snapshot_repo, diff_service)
    summary = await use_case.get_summary("proj-1", "snap-A", "snap-B")

    assert summary["added_asset_count"] == 10
    assert summary["removed_asset_count"] == 2
    assert summary["modified_annotation_count"] == 5
    assert summary["class_distribution_deltas"]["car"] == 8


@pytest.mark.asyncio
async def test_diff_summary_rejects_creating_snapshot(ready_snapshot_a):
    creating_snapshot = SnapshotEntity(
        id="snap-C",
        project_id="proj-1",
        dataset_version_id="ds-v1",
        ontology_version_id="ont-v1",
        version_name="v3.0.0",
        status=SnapshotStatus.CREATING,
        selection_policy=SelectionPolicy.LATEST_APPROVED,
        include_unannotated=False,
        split_strategy=SplitStrategy.STRATIFIED,
        split_ratios=SplitRatios(0.7, 0.15, 0.15),
        created_by=1001,
    )
    snapshot_repo = MagicMock()
    snapshot_repo.get_by_id = AsyncMock(
        side_effect=lambda sid: (
            ready_snapshot_a if sid == "snap-A" else creating_snapshot
        )
    )
    diff_service = MagicMock()

    use_case = DiffSnapshotsUseCase(snapshot_repo, diff_service)
    with pytest.raises(
        ValueError, match="Diff is only supported for READY or ARCHIVED"
    ):
        await use_case.get_summary("proj-1", "snap-A", "snap-C")
