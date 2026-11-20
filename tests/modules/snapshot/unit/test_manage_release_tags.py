from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from modules.snapshot.application.use_cases.manage_release_tags import (
    ManageReleaseTagsUseCase,
)
from modules.snapshot.domain.entities import SnapshotEntity
from modules.snapshot.domain.exceptions import SnapshotNotFoundError
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
async def test_assign_tag_success(ready_snapshot):
    snapshot_repo = MagicMock()
    snapshot_repo.get_by_id = AsyncMock(return_value=ready_snapshot)

    tag_repo = MagicMock()
    tag_repo.upsert = AsyncMock(side_effect=lambda tag: tag)

    use_case = ManageReleaseTagsUseCase(snapshot_repo, tag_repo)
    tag = await use_case.assign_tag(
        project_id="proj-1",
        snapshot_id="snap-ready",
        name="production",
        user_id=1001,
    )

    assert tag.name == "production"
    assert tag.snapshot_id == "snap-ready"
    assert tag.project_id == "proj-1"
    tag_repo.upsert.assert_called_once()


@pytest.mark.asyncio
async def test_assign_tag_rejects_creating_snapshot():
    creating_snapshot = SnapshotEntity(
        id="snap-creating",
        project_id="proj-1",
        dataset_version_id="ds-v1",
        ontology_version_id="ont-v1",
        version_name="v1.0.0",
        status=SnapshotStatus.CREATING,
        selection_policy=SelectionPolicy.LATEST_APPROVED,
        include_unannotated=False,
        split_strategy=SplitStrategy.STRATIFIED,
        split_ratios=SplitRatios(0.7, 0.15, 0.15),
        created_by=1001,
    )
    snapshot_repo = MagicMock()
    snapshot_repo.get_by_id = AsyncMock(return_value=creating_snapshot)
    tag_repo = MagicMock()

    use_case = ManageReleaseTagsUseCase(snapshot_repo, tag_repo)
    with pytest.raises(ValueError, match="Only 'READY' snapshots can be tagged"):
        await use_case.assign_tag(
            project_id="proj-1",
            snapshot_id="snap-creating",
            name="production",
            user_id=1001,
        )


@pytest.mark.asyncio
async def test_delete_tag():
    snapshot_repo = MagicMock()
    tag_repo = MagicMock()
    tag_repo.delete = AsyncMock(return_value=True)

    use_case = ManageReleaseTagsUseCase(snapshot_repo, tag_repo)
    success = await use_case.delete_tag("proj-1", "production")
    assert success is True

    # Test deleting non-existent tag
    tag_repo.delete = AsyncMock(return_value=False)
    with pytest.raises(SnapshotNotFoundError):
        await use_case.delete_tag("proj-1", "non-existent")
