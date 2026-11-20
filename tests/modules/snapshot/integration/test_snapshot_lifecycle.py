import asyncio
from datetime import datetime, timezone
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
from modules.snapshot.domain.interfaces import DatasetAssetInfo, ResolvedAnnotationInfo
from modules.snapshot.domain.services.checksum_service import (
    DefaultChecksumService,
)
from modules.snapshot.domain.services.stratification_service import (
    DefaultStratificationService,
)
from modules.snapshot.domain.value_objects import (
    SelectionPolicy,
    SnapshotStatus,
    SplitRatios,
    SplitStrategy,
)
from modules.snapshot.infrastructure.background.snapshot_worker import (
    SnapshotWorker,
)


@pytest.mark.asyncio
async def test_snapshot_lifecycle_end_to_end():
    # In-memory storage for repository mocks
    snapshots_db: dict[str, SnapshotEntity] = {}
    items_db: list = []
    manifests_db: list = []

    snapshot_repo = MagicMock()

    async def mock_create_snapshot(entity: SnapshotEntity):
        snapshots_db[entity.id] = entity
        return entity

    async def mock_get_snapshot(sid: str):
        return snapshots_db.get(sid)

    async def mock_update_snapshot(entity: SnapshotEntity):
        snapshots_db[entity.id] = entity
        return entity

    snapshot_repo.create = AsyncMock(side_effect=mock_create_snapshot)
    snapshot_repo.get_by_id = AsyncMock(side_effect=mock_get_snapshot)
    snapshot_repo.update = AsyncMock(side_effect=mock_update_snapshot)
    snapshot_repo.get_by_project_and_version = AsyncMock(return_value=None)
    snapshot_repo.count_by_project = AsyncMock(return_value=0)

    snapshot_item_repo = MagicMock()

    async def mock_bulk_create(items):
        items_db.extend(items)
        return len(items)

    snapshot_item_repo.bulk_create = AsyncMock(side_effect=mock_bulk_create)
    snapshot_item_repo.delete_by_snapshot = AsyncMock(return_value=0)

    manifest_repo = MagicMock()

    async def mock_create_manifest(manifest):
        manifests_db.append(manifest)
        return manifest

    manifest_repo.create = AsyncMock(side_effect=mock_create_manifest)

    # 10 Assets in dataset version
    assets = [
        DatasetAssetInfo(
            asset_id=f"asset_{i:02d}",
            sha256=f"hash_{i:02d}",
            uri=f"s3://bucket/assets/img_{i:02d}.jpg",
        )
        for i in range(10)
    ]
    dataset_gateway = MagicMock()
    dataset_gateway.get_version_assets = AsyncMock(return_value=assets)

    # 10 Revisions, 2 labels
    resolved = {
        f"asset_{i:02d}": ResolvedAnnotationInfo(
            annotation_revision_id=f"rev_{i:02d}",
            asset_id=f"asset_{i:02d}",
            labels=["car"] if i < 6 else ["pedestrian"],
            revision_sha256=f"rev_hash_{i:02d}",
        )
        for i in range(10)
    }
    annotation_gateway = MagicMock()
    annotation_gateway.resolve_revisions = AsyncMock(return_value=resolved)

    ontology_gateway = MagicMock()
    ontology_gateway.validate_revisions = AsyncMock(return_value=(True, []))

    storage_gateway = MagicMock()
    storage_gateway.upload_manifest = AsyncMock(
        return_value="s3://ai-data-platform/projects/p1/snapshots/s1/manifest.json"
    )
    storage_gateway.delete_object = AsyncMock(return_value=True)

    checksum_service = DefaultChecksumService()
    stratification_service = DefaultStratificationService()

    worker = SnapshotWorker(
        snapshot_repo=snapshot_repo,
        snapshot_item_repo=snapshot_item_repo,
        manifest_repo=manifest_repo,
        dataset_gateway=dataset_gateway,
        annotation_gateway=annotation_gateway,
        ontology_gateway=ontology_gateway,
        storage_gateway=storage_gateway,
        checksum_service=checksum_service,
        stratification_service=stratification_service,
    )

    create_uc = CreateSnapshotUseCase(
        snapshot_repo=snapshot_repo,
        worker=worker,
    )

    req = SnapshotCreateRequest(
        dataset_version_id="01JDS000000000000000000001",
        ontology_version_id="01JONT00000000000000000001",
        version_name="v1.0.0",
        selection_policy=SelectionPolicy.LATEST_APPROVED,
        split_strategy=SplitStrategy.STRATIFIED,
        split_ratios=SplitRatiosDTO(train=0.7, validation=0.15, test=0.15),
        split_seed=42,
    )

    snapshot = await create_uc.execute("01JPROJ0000000000000000001", req, user_id=1001)

    assert snapshot.status == SnapshotStatus.CREATING
    assert snapshot.version_name == "v1.0.0"

    # Await worker execution directly to verify completion
    completed = await worker.execute(snapshot.id)

    assert completed.error_code is None, f"Failed: {completed.error_code} - {completed.error_message}"
    assert completed.status == SnapshotStatus.READY
    assert completed.finalized_at is not None
    assert len(items_db) == 10
    assert len(manifests_db) == 1

    manifest = manifests_db[0]
    assert manifest.asset_count == 10
    assert manifest.annotation_count == 10
    assert manifest.aggregate_checksum is not None
    assert manifest.split_distribution["train"]["count"] > 0
    assert manifest.split_distribution["test"]["count"] > 0
