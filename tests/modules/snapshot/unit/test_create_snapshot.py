from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from modules.snapshot.application.dtos.snapshot_dtos import (
    SnapshotCreateRequest,
    SplitRatiosDTO,
)
from modules.snapshot.application.use_cases.cancel_snapshot import (
    CancelSnapshotUseCase,
)
from modules.snapshot.application.use_cases.create_snapshot import (
    CreateSnapshotUseCase,
)
from modules.snapshot.domain.entities import SnapshotEntity
from modules.snapshot.domain.exceptions import (
    SnapshotNotFoundError,
    SnapshotVersionConflictError,
)
from modules.snapshot.domain.value_objects import (
    SelectionPolicy,
    SnapshotStatus,
    SplitRatios,
    SplitStrategy,
)


@pytest.fixture
def mock_snapshot_repo():
    repo = MagicMock()
    repo.get_by_project_and_version = AsyncMock(return_value=None)
    repo.count_by_project = AsyncMock(return_value=2)
    repo.create = AsyncMock(side_effect=lambda entity: entity)
    repo.get_by_id = AsyncMock(return_value=None)
    repo.update = AsyncMock(side_effect=lambda entity: entity)
    return repo


@pytest.fixture
def mock_worker():
    """Unit of work + launcher sharing one call log to check their order."""
    calls: list[str] = []
    uow = MagicMock()
    uow.commit = AsyncMock(side_effect=lambda: calls.append("commit"))
    uow.rollback = AsyncMock()
    launcher = MagicMock()
    launcher.launch = MagicMock(side_effect=lambda sid: calls.append(f"launch:{sid}"))
    return {"uow": uow, "launcher": launcher, "calls": calls}


@pytest.mark.asyncio
async def test_create_snapshot_auto_version(mock_snapshot_repo, mock_worker):
    use_case = CreateSnapshotUseCase(
        snapshot_repo=mock_snapshot_repo,
        uow=mock_worker["uow"],
        launcher=mock_worker["launcher"],
    )
    request = SnapshotCreateRequest(
        dataset_version_id="01JABCDEF12345678901234567",
        ontology_version_id="01JBCDEF012345678901234567",
        version_name=None,  # should auto-generate v3 (count=2)
        selection_policy=SelectionPolicy.LATEST_APPROVED,
        split_ratios=SplitRatiosDTO(train=0.8, validation=0.1, test=0.1),
    )

    snapshot = await use_case.execute(
        project_id="01JPROJ123456789012345678",
        request=request,
        user_id=1001,
    )

    assert snapshot.version_name == "v3"
    assert snapshot.status == SnapshotStatus.CREATING
    assert snapshot.created_by == 1001
    assert snapshot.split_ratios.train == 0.8
    mock_snapshot_repo.create.assert_called_once()
    # The build runs in its own session, so the row must be committed first.
    assert mock_worker["calls"] == ["commit", f"launch:{snapshot.id}"]


@pytest.mark.asyncio
async def test_create_snapshot_version_conflict(mock_snapshot_repo, mock_worker):
    mock_snapshot_repo.get_by_project_and_version.return_value = MagicMock()
    use_case = CreateSnapshotUseCase(
        snapshot_repo=mock_snapshot_repo,
        uow=mock_worker["uow"],
        launcher=mock_worker["launcher"],
    )
    request = SnapshotCreateRequest(
        dataset_version_id="01JABCDEF12345678901234567",
        ontology_version_id="01JBCDEF012345678901234567",
        version_name="v1.0.0",
        split_ratios=SplitRatiosDTO(train=0.7, validation=0.15, test=0.15),
    )

    with pytest.raises(SnapshotVersionConflictError):
        await use_case.execute(
            project_id="01JPROJ123456789012345678",
            request=request,
            user_id=1001,
        )
    assert mock_worker["calls"] == []


@pytest.mark.asyncio
async def test_cancel_snapshot_success(mock_snapshot_repo):
    existing = SnapshotEntity(
        id="01JXYZ98765432101234567890",
        project_id="proj-1",
        dataset_version_id="ds-v1",
        ontology_version_id="ont-v1",
        version_name="v1.0",
        status=SnapshotStatus.CREATING,
        selection_policy=SelectionPolicy.LATEST_APPROVED,
        include_unannotated=False,
        split_strategy=SplitStrategy.STRATIFIED,
        split_ratios=SplitRatios(0.7, 0.15, 0.15),
        created_by=1001,
        created_at=datetime.now(UTC),
    )
    mock_snapshot_repo.get_by_id.return_value = existing

    use_case = CancelSnapshotUseCase(snapshot_repo=mock_snapshot_repo)
    cancelled = await use_case.execute(
        project_id="proj-1",
        snapshot_id="01JXYZ98765432101234567890",
        user_id=1001,
    )

    assert cancelled.status == SnapshotStatus.FAILED
    assert cancelled.error_code == "cancelled_by_user"
    mock_snapshot_repo.update.assert_called_once()


@pytest.mark.asyncio
async def test_cancel_snapshot_not_found(mock_snapshot_repo):
    mock_snapshot_repo.get_by_id.return_value = None
    use_case = CancelSnapshotUseCase(snapshot_repo=mock_snapshot_repo)

    with pytest.raises(SnapshotNotFoundError):
        await use_case.execute(
            project_id="proj-1",
            snapshot_id="unknown",
            user_id=1001,
        )


@pytest.mark.asyncio
async def test_cancel_already_ready_snapshot(mock_snapshot_repo):
    existing = SnapshotEntity(
        id="01JXYZ98765432101234567890",
        project_id="proj-1",
        dataset_version_id="ds-v1",
        ontology_version_id="ont-v1",
        version_name="v1.0",
        status=SnapshotStatus.READY,
        selection_policy=SelectionPolicy.LATEST_APPROVED,
        include_unannotated=False,
        split_strategy=SplitStrategy.STRATIFIED,
        split_ratios=SplitRatios(0.7, 0.15, 0.15),
        created_by=1001,
        created_at=datetime.now(UTC),
    )
    mock_snapshot_repo.get_by_id.return_value = existing
    use_case = CancelSnapshotUseCase(snapshot_repo=mock_snapshot_repo)

    with pytest.raises(ValueError, match="Only 'CREATING' snapshots can be cancelled"):
        await use_case.execute(
            project_id="proj-1",
            snapshot_id="01JXYZ98765432101234567890",
            user_id=1001,
        )
