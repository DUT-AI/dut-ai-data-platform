import asyncio
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from modules.snapshot.domain.entities import SnapshotEntity
from modules.snapshot.domain.interfaces import DatasetAssetInfo, ResolvedAnnotationInfo
from modules.snapshot.domain.value_objects import (
    SelectionPolicy,
    SnapshotStatus,
    SplitRatios,
    SplitStrategy,
)
from modules.snapshot.infrastructure.background.snapshot_worker import (
    SnapshotWorker,
    clear_snapshot_cancellation,
    request_snapshot_cancellation,
)


@pytest.fixture
def base_snapshot():
    return SnapshotEntity(
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


@pytest.fixture
def mock_dependencies():
    snapshot_repo = MagicMock()
    snapshot_repo.update = AsyncMock(side_effect=lambda s: s)

    snapshot_item_repo = MagicMock()
    snapshot_item_repo.bulk_create = AsyncMock(return_value=2)
    snapshot_item_repo.delete_by_snapshot = AsyncMock(return_value=0)

    manifest_repo = MagicMock()
    manifest_repo.create = AsyncMock(side_effect=lambda m: m)

    dataset_gateway = MagicMock()
    dataset_gateway.get_version_assets = AsyncMock(
        return_value=[
            DatasetAssetInfo(asset_id="a1", sha256="h1", uri="s3://b/1"),
            DatasetAssetInfo(asset_id="a2", sha256="h2", uri="s3://b/2"),
        ]
    )

    annotation_gateway = MagicMock()
    annotation_gateway.resolve_revisions = AsyncMock(
        return_value={
            "a1": ResolvedAnnotationInfo("r1", "a1", ["car"], "rh1"),
            "a2": ResolvedAnnotationInfo("r2", "a2", ["pedestrian"], "rh2"),
        }
    )

    ontology_gateway = MagicMock()
    ontology_gateway.validate_revisions = AsyncMock(return_value=(True, []))

    storage_gateway = MagicMock()
    storage_gateway.upload_manifest = AsyncMock(
        return_value="s3://ai-data-platform/manifest.json"
    )
    storage_gateway.delete_object = AsyncMock(return_value=True)

    checksum_service = MagicMock()
    checksum_service.compute_item_checksum = MagicMock(return_value="item-sha")
    checksum_service.compute_aggregate_checksum = MagicMock(return_value="agg-sha")

    stratification_service = MagicMock()
    stratification_service.assign_splits_stratified = MagicMock(
        return_value={"a1": "train", "a2": "validation"}
    )
    stratification_service.assign_splits_random = MagicMock(
        return_value={"a1": "train", "a2": "test"}
    )

    return {
        "snapshot_repo": snapshot_repo,
        "snapshot_item_repo": snapshot_item_repo,
        "manifest_repo": manifest_repo,
        "dataset_gateway": dataset_gateway,
        "annotation_gateway": annotation_gateway,
        "ontology_gateway": ontology_gateway,
        "storage_gateway": storage_gateway,
        "checksum_service": checksum_service,
        "stratification_service": stratification_service,
        "uow": FakeUnitOfWork(),
    }


class FakeUnitOfWork:
    def __init__(self, fail_first_commit: bool = False) -> None:
        self.fail_first_commit = fail_first_commit
        self.commits = 0
        self.rollbacks = 0

    async def commit(self) -> None:
        self.commits += 1
        if self.fail_first_commit and self.commits == 1:
            raise RuntimeError("connection lost during commit")

    async def rollback(self) -> None:
        self.rollbacks += 1


@pytest.mark.asyncio
async def test_worker_happy_path(base_snapshot, mock_dependencies):
    deps = mock_dependencies
    deps["snapshot_repo"].get_by_id = AsyncMock(return_value=base_snapshot)

    worker = SnapshotWorker(**deps)
    result = await worker.execute(base_snapshot.id)

    assert result.error_code is None, (
        f"Failed with {result.error_code}: {result.error_message}"
    )
    assert result.status == SnapshotStatus.READY
    assert result.finalized_at is not None
    assert result.error_code is None
    deps["snapshot_item_repo"].bulk_create.assert_called_once()
    deps["manifest_repo"].create.assert_called_once()


@pytest.mark.asyncio
async def test_worker_dataset_empty_fails(base_snapshot, mock_dependencies):
    deps = mock_dependencies
    deps["snapshot_repo"].get_by_id = AsyncMock(return_value=base_snapshot)
    deps["dataset_gateway"].get_version_assets = AsyncMock(return_value=[])

    worker = SnapshotWorker(**deps)
    result = await worker.execute(base_snapshot.id)

    assert result.status == SnapshotStatus.FAILED
    assert result.error_code == "dataset_version_empty"


@pytest.mark.asyncio
async def test_worker_ontology_incompatibility_fails(base_snapshot, mock_dependencies):
    deps = mock_dependencies
    deps["snapshot_repo"].get_by_id = AsyncMock(return_value=base_snapshot)
    deps["ontology_gateway"].validate_revisions = AsyncMock(
        return_value=(False, ["Invalid label category 'tank'"])
    )

    worker = SnapshotWorker(**deps)
    result = await worker.execute(base_snapshot.id)

    assert result.status == SnapshotStatus.FAILED
    assert result.error_code == "ontology_incompatibility"
    assert "Invalid label category" in result.error_message


@pytest.mark.asyncio
async def test_worker_cancellation(base_snapshot, mock_dependencies):
    deps = mock_dependencies
    deps["snapshot_repo"].get_by_id = AsyncMock(return_value=base_snapshot)

    request_snapshot_cancellation(base_snapshot.id)
    try:
        worker = SnapshotWorker(**deps)
        result = await worker.execute(base_snapshot.id)

        assert result.status == SnapshotStatus.FAILED
        assert result.error_code == "cancelled_by_user"
    finally:
        clear_snapshot_cancellation(base_snapshot.id)


@pytest.mark.asyncio
async def test_worker_timeout(base_snapshot, mock_dependencies):
    deps = mock_dependencies
    deps["snapshot_repo"].get_by_id = AsyncMock(return_value=base_snapshot)

    # Force a delay in dataset gateway that exceeds timeout
    async def delayed_assets(*args, **kwargs):
        await asyncio.sleep(0.5)
        return []

    deps["dataset_gateway"].get_version_assets = delayed_assets

    worker = SnapshotWorker(**deps, timeout_seconds=0.05)
    result = await worker.execute(base_snapshot.id)

    assert result.status == SnapshotStatus.FAILED
    assert result.error_code == "creation_timeout"


# ---------------------------------------------------------------------------
# Unit of work: one commit on success; rollback + manifest cleanup on failure
# ---------------------------------------------------------------------------

MANIFEST_URI = "s3://ai-data-platform/manifest.json"


@pytest.mark.asyncio
async def test_success_commits_once_and_keeps_manifest(base_snapshot, mock_dependencies):
    deps = mock_dependencies
    deps["snapshot_repo"].get_by_id = AsyncMock(return_value=base_snapshot)

    result = await SnapshotWorker(**deps).execute(base_snapshot.id)

    assert result.status == SnapshotStatus.READY
    assert (deps["uow"].commits, deps["uow"].rollbacks) == (1, 0)
    deps["storage_gateway"].delete_object.assert_not_called()


@pytest.mark.asyncio
async def test_db_error_after_manifest_upload_rolls_back_and_deletes_manifest(
    base_snapshot, mock_dependencies
):
    deps = mock_dependencies
    deps["snapshot_repo"].get_by_id = AsyncMock(return_value=base_snapshot)
    deps["manifest_repo"].create = AsyncMock(side_effect=RuntimeError("db write failed"))

    result = await SnapshotWorker(**deps).execute(base_snapshot.id)

    assert result.status == SnapshotStatus.FAILED
    assert result.error_code == "snapshot_creation_error"
    assert deps["uow"].rollbacks == 1
    deps["storage_gateway"].delete_object.assert_awaited_once_with(MANIFEST_URI)
    # Only the FAILED status is committed, in a new transaction.
    assert deps["uow"].commits == 1
    # Items are discarded by the rollback, not by a manual DELETE.
    deps["snapshot_item_repo"].delete_by_snapshot.assert_not_called()


@pytest.mark.asyncio
async def test_commit_failure_rolls_back_and_deletes_manifest(
    base_snapshot, mock_dependencies
):
    deps = mock_dependencies
    deps["uow"] = FakeUnitOfWork(fail_first_commit=True)
    deps["snapshot_repo"].get_by_id = AsyncMock(return_value=base_snapshot)

    result = await SnapshotWorker(**deps).execute(base_snapshot.id)

    assert result.status == SnapshotStatus.FAILED
    assert "commit" in result.error_message
    assert deps["uow"].rollbacks == 1
    deps["storage_gateway"].delete_object.assert_awaited_once_with(MANIFEST_URI)


@pytest.mark.asyncio
async def test_failure_before_upload_has_nothing_to_delete(
    base_snapshot, mock_dependencies
):
    deps = mock_dependencies
    deps["snapshot_repo"].get_by_id = AsyncMock(return_value=base_snapshot)
    deps["snapshot_item_repo"].bulk_create = AsyncMock(side_effect=RuntimeError("boom"))

    result = await SnapshotWorker(**deps).execute(base_snapshot.id)

    assert result.status == SnapshotStatus.FAILED
    assert deps["uow"].rollbacks == 1
    deps["storage_gateway"].upload_manifest.assert_not_called()
    deps["storage_gateway"].delete_object.assert_not_called()


@pytest.mark.asyncio
async def test_cancellation_after_upload_rolls_back_and_deletes_manifest(
    base_snapshot, mock_dependencies
):
    deps = mock_dependencies
    deps["snapshot_repo"].get_by_id = AsyncMock(return_value=base_snapshot)

    async def cancel_while_saving_manifest(manifest):
        request_snapshot_cancellation(base_snapshot.id)
        return manifest

    deps["manifest_repo"].create = AsyncMock(side_effect=cancel_while_saving_manifest)

    result = await SnapshotWorker(**deps).execute(base_snapshot.id)

    assert result.status == SnapshotStatus.FAILED
    assert result.error_code == "cancelled_by_user"
    assert deps["uow"].rollbacks == 1
    deps["storage_gateway"].delete_object.assert_awaited_once_with(MANIFEST_URI)


@pytest.mark.asyncio
async def test_does_not_overwrite_status_set_by_cancel_use_case(
    base_snapshot, mock_dependencies
):
    """CancelSnapshotUseCase already stored FAILED; the worker keeps that record."""
    deps = mock_dependencies
    already_failed = SnapshotEntity(
        **{**base_snapshot.__dict__, "status": SnapshotStatus.FAILED,
           "error_code": "cancelled_by_user", "error_message": "by user 7"}
    )
    deps["snapshot_repo"].get_by_id = AsyncMock(side_effect=[base_snapshot, already_failed])
    deps["manifest_repo"].create = AsyncMock(side_effect=RuntimeError("late failure"))

    result = await SnapshotWorker(**deps).execute(base_snapshot.id)

    assert result.error_code == "cancelled_by_user"
    assert result.error_message == "by user 7"
    deps["snapshot_repo"].update.assert_not_called()


@pytest.mark.asyncio
async def test_manifest_delete_failure_is_logged_not_raised(
    base_snapshot, mock_dependencies
):
    deps = mock_dependencies
    deps["snapshot_repo"].get_by_id = AsyncMock(return_value=base_snapshot)
    deps["manifest_repo"].create = AsyncMock(side_effect=RuntimeError("db write failed"))
    deps["storage_gateway"].delete_object = AsyncMock(side_effect=OSError("minio down"))

    result = await SnapshotWorker(**deps).execute(base_snapshot.id)

    assert result.status == SnapshotStatus.FAILED
    assert result.error_code == "snapshot_creation_error"


@pytest.mark.asyncio
async def test_task_cancellation_cleans_up_and_propagates(
    base_snapshot, mock_dependencies
):
    deps = mock_dependencies
    deps["snapshot_repo"].get_by_id = AsyncMock(return_value=base_snapshot)
    deps["manifest_repo"].create = AsyncMock(side_effect=asyncio.CancelledError())

    with pytest.raises(asyncio.CancelledError):
        await SnapshotWorker(**deps).execute(base_snapshot.id)

    assert (deps["uow"].commits, deps["uow"].rollbacks) == (0, 1)
    deps["storage_gateway"].delete_object.assert_awaited_once_with(MANIFEST_URI)
