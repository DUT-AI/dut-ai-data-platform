from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from modules.snapshot.domain.entities import SnapshotEntity
from modules.snapshot.domain.value_objects import (
    SelectionPolicy,
    SnapshotStatus,
    SplitRatios,
    SplitStrategy,
)
from modules.snapshot.infrastructure.services.snapshot_diff_service import (
    SqlSnapshotDiffService,
)


@pytest.fixture
def snap_a():
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
def snap_b():
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
async def test_diff_service_item_level_query(snap_a, snap_b):
    # Snapshot A items: asset_1 (train, rev_1), asset_2 (train, rev_1)
    # Snapshot B items: asset_2 (train, rev_2 -> modified), asset_3 (train, rev_1 -> added)
    # asset_1 is removed
    session = MagicMock()

    class MockItem:
        def __init__(self, asset_id, rev_id, split):
            self.asset_id = asset_id
            self.annotation_revision_id = rev_id
            self.split = split

    async def mock_execute(stmt):
        res = MagicMock()
        # Check query string representation or match
        stmt_str = str(stmt)
        if (
            "snapshot_id = :snapshot_id_1" in stmt_str
            or "snapshot_manifests" in stmt_str
        ):
            res.scalar_one_or_none.return_value = None
            res.all.return_value = []
        return res

    service = SqlSnapshotDiffService(session)

    # Unit check of list_diff_items logic
    items_base = [
        MockItem("asset_1", "rev_1", "train"),
        MockItem("asset_2", "rev_1", "train"),
    ]
    items_target = [
        MockItem("asset_2", "rev_2", "train"),
        MockItem("asset_3", "rev_1", "train"),
    ]

    res_base = MagicMock()
    res_base.all.return_value = items_base
    res_target = MagicMock()
    res_target.all.return_value = items_target

    session.execute = AsyncMock(side_effect=[res_base, res_target])

    # 1. Check "added" items -> asset_3
    added_items, _next_cur = await service.list_diff_items(
        base_snapshot_id="snap-A",
        target_snapshot_id="snap-B",
        change_type="added",
    )
    assert len(added_items) == 1
    assert added_items[0]["asset_id"] == "asset_3"
    assert added_items[0]["change_type"] == "added"

    # 2. Check "modified" items -> asset_2
    session.execute = AsyncMock(side_effect=[res_base, res_target])
    modified_items, _ = await service.list_diff_items(
        base_snapshot_id="snap-A",
        target_snapshot_id="snap-B",
        change_type="modified",
    )
    assert len(modified_items) == 1
    assert modified_items[0]["asset_id"] == "asset_2"
    assert modified_items[0]["base_revision_id"] == "rev_1"
    assert modified_items[0]["target_revision_id"] == "rev_2"
