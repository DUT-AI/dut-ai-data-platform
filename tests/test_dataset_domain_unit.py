from unittest.mock import AsyncMock, MagicMock

import pytest

from core.exceptions import BadRequestException
from modules.dataset.domain.entities import AssetEntity, DatasetEntity, DatasetVersionEntity
from modules.dataset.domain.policies import AssetDeletionPolicy, DatasetVersionPolicy
from modules.dataset.dtos.dataset_dtos import (
    AssetResponseDTO,
    DatasetResponseDTO,
    DatasetVersionCreateDTO,
    DatasetVersionResponseDTO,
    FinalizeAssetImportItemDTO,
    FinalizeAssetImportRequestDTO,
    PrepareUploadItemDTO,
    PrepareUploadRequestDTO,
)
from modules.dataset.use_cases import (
    ArchiveDatasetUseCase,
    CreateDatasetVersionUseCase,
    FinalizeAssetImportUseCase,
    ListVersionAssetsCursorUseCase,
    PrepareAssetUploadUseCase,
    PublishDatasetVersionUseCase,
    RetireAssetUseCase,
)


# ============================================================================
# Phase 1: Domain Entities & DTOs Field Validation
# ============================================================================


def test_dataset_entity_phase1_fields():
    dataset = DatasetEntity(
        project_id="proj_123",
        name="Test Dataset",
        description="A test dataset",
        tags=["vision", "coco"],
        status="active",
        latest_published_version_number=1,
        created_by="user_456",
    )
    assert dataset.tags == ["vision", "coco"]
    assert dataset.latest_published_version_number == 1
    assert dataset.created_by == "user_456"

    dto = DatasetResponseDTO.model_validate(dataset)
    assert dto.tags == ["vision", "coco"]
    assert dto.latest_published_version_number == 1
    assert dto.created_by == "user_456"


def test_dataset_version_entity_phase1_fields():
    version = DatasetVersionEntity(
        dataset_id="ds_123",
        version="v1.0.0",
        version_number=1,
        version_label="v1.0.0",
        parent_version_id=None,
        status="draft",
        version_config={"split": [0.8, 0.2]},
        manifest_hash="a1b2c3d4e5f6",
        created_by="user_456",
    )
    assert version.version_number == 1
    assert version.version_label == "v1.0.0"
    assert version.version_config == {"split": [0.8, 0.2]}
    assert version.manifest_hash == "a1b2c3d4e5f6"
    assert version.created_by == "user_456"

    dto = DatasetVersionResponseDTO.model_validate(version)
    assert dto.version_number == 1
    assert dto.version_config == {"split": [0.8, 0.2]}
    assert dto.manifest_hash == "a1b2c3d4e5f6"


def test_asset_entity_phase1_fields():
    asset = AssetEntity(
        project_id="proj_123",
        filename="image.jpg",
        uri="s3://bucket/image.jpg",
        mime_type="image/jpeg",
        file_size=1024,
        sha256="1234567890abcdef",
        data_format="JPEG",
        status="READY",
        provenance={"source": "camera_1"},
        created_by="user_456",
    )
    assert asset.data_format == "JPEG"
    assert asset.status == "READY"
    assert asset.provenance == {"source": "camera_1"}
    assert asset.created_by == "user_456"

    dto = AssetResponseDTO.model_validate(asset)
    assert dto.data_format == "JPEG"
    assert dto.status == "READY"
    assert dto.provenance == {"source": "camera_1"}


# ============================================================================
# Phase 2: Presigned Upload & Import Use Cases
# ============================================================================


@pytest.mark.asyncio
async def test_prepare_asset_upload_use_case_success():
    repo = MagicMock()
    storage = MagicMock()

    mock_version = DatasetVersionEntity(dataset_id="ds_123", version="v1.0.0", status="draft")
    mock_dataset = DatasetEntity(project_id="proj_456", name="Test DS")

    repo.get_version_by_id = AsyncMock(return_value=mock_version)
    repo.get_dataset_by_id = AsyncMock(return_value=mock_dataset)
    storage.get_presigned_upload_url = AsyncMock(
        return_value="https://minio.test/bucket/key?signature=abc"
    )

    use_case = PrepareAssetUploadUseCase(repo=repo, storage_provider=storage)
    payload = PrepareUploadRequestDTO(
        files=[PrepareUploadItemDTO(filename="image_01.jpg", content_type="image/jpeg")]
    )

    res = await use_case.execute("ver_789", payload)

    assert len(res.items) == 1
    item = res.items[0]
    assert item.filename == "image_01.jpg"
    assert item.upload_url == "https://minio.test/bucket/key?signature=abc"
    assert f"project-proj_456/assets/{item.asset_id}/image_01.jpg" == item.storage_key
    storage.get_presigned_upload_url.assert_called_once()


@pytest.mark.asyncio
async def test_prepare_asset_upload_published_version_fails():
    repo = MagicMock()
    storage = MagicMock()

    mock_version = DatasetVersionEntity(dataset_id="ds_123", version="v1.0.0", status="published")
    repo.get_version_by_id = AsyncMock(return_value=mock_version)

    use_case = PrepareAssetUploadUseCase(repo=repo, storage_provider=storage)
    payload = PrepareUploadRequestDTO(
        files=[PrepareUploadItemDTO(filename="image_01.jpg")]
    )

    with pytest.raises(BadRequestException) as exc_info:
        await use_case.execute("ver_789", payload)

    assert "Only draft versions allow asset uploads" in str(exc_info.value)


@pytest.mark.asyncio
async def test_finalize_asset_import_use_case_success():
    repo = MagicMock()
    storage = MagicMock()

    mock_version = DatasetVersionEntity(dataset_id="ds_123", version="v1.0.0", status="draft")
    mock_dataset = DatasetEntity(project_id="proj_456", name="Test DS")

    repo.get_version_by_id = AsyncMock(return_value=mock_version)
    repo.get_dataset_by_id = AsyncMock(return_value=mock_dataset)
    repo.find_asset_by_sha256 = AsyncMock(return_value=None)
    repo.save_asset = AsyncMock(side_effect=lambda a: a)
    repo.add_asset_to_version = AsyncMock()


    use_case = FinalizeAssetImportUseCase(repo=repo, storage_provider=storage)
    payload = FinalizeAssetImportRequestDTO(
        items=[
            FinalizeAssetImportItemDTO(
                asset_id="ast_001",
                filename="image_01.jpg",
                storage_key="project-proj_456/assets/ast_001/image_01.jpg",
                sha256="hash123",
                file_size=1024,
                mime_type="image/jpeg",
                data_format="JPEG",
            )
        ]
    )

    res = await use_case.execute("ver_789", payload, created_by="user_101")

    assert len(res.imported_assets) == 1
    asset = res.imported_assets[0]
    assert asset.id == "ast_001"
    assert asset.filename == "image_01.jpg"
    assert asset.sha256 == "hash123"
    assert asset.status == "READY"
    assert asset.data_format == "JPEG"

    repo.save_asset.assert_called_once()
    repo.add_asset_to_version.assert_called_once_with("ver_789", "ast_001")


# ============================================================================
# Phase 3: Policies, Publishing Manifest Hash & Cursor Pagination
# ============================================================================


def test_dataset_version_policy_ensure_can_modify_draft():
    draft_ver = DatasetVersionEntity(dataset_id="ds_1", version="v1.0.0", status="draft")
    pub_ver = DatasetVersionEntity(dataset_id="ds_1", version="v1.0.0", status="published")

    DatasetVersionPolicy.ensure_can_modify_draft(draft_ver)

    with pytest.raises(BadRequestException) as exc_info:
        DatasetVersionPolicy.ensure_can_modify_draft(pub_ver)
    assert "Only DRAFT versions can be modified" in str(exc_info.value)


def test_dataset_version_policy_ensure_can_publish():
    active_dataset = DatasetEntity(project_id="p1", name="Active DS", status="active")
    archived_dataset = DatasetEntity(project_id="p1", name="Archived DS", status="archived")

    draft_ver = DatasetVersionEntity(dataset_id="ds_1", version="v1.0.0", status="draft")
    pub_ver = DatasetVersionEntity(dataset_id="ds_1", version="v1.0.0", status="published")

    DatasetVersionPolicy.ensure_can_publish(active_dataset, draft_ver)

    with pytest.raises(BadRequestException) as exc1:
        DatasetVersionPolicy.ensure_can_publish(archived_dataset, draft_ver)
    assert "Dataset must be ACTIVE" in str(exc1.value)

    with pytest.raises(BadRequestException) as exc2:
        DatasetVersionPolicy.ensure_can_publish(active_dataset, pub_ver)
    assert "already published" in str(exc2.value)


def test_dataset_version_policy_compute_manifest_hash():
    version = DatasetVersionEntity(id="ver_001", dataset_id="ds_1", version="v1.0.0")
    assets = [
        AssetEntity(id="ast_002", project_id="p1", filename="b.jpg", uri="/b", mime_type="image/jpeg", file_size=200, sha256="hash2"),
        AssetEntity(id="ast_001", project_id="p1", filename="a.jpg", uri="/a", mime_type="image/jpeg", file_size=100, sha256="hash1"),
    ]

    hash1 = DatasetVersionPolicy.compute_manifest_hash(version, assets, {"split": "train"})
    hash2 = DatasetVersionPolicy.compute_manifest_hash(version, list(reversed(assets)), {"split": "train"})

    assert len(hash1) == 64
    assert hash1 == hash2


@pytest.mark.asyncio
async def test_publish_dataset_version_use_case_success():
    repo = MagicMock()

    mock_version = DatasetVersionEntity(id="ver_001", dataset_id="ds_123", version="v1.0.0", version_number=1, status="draft")
    mock_dataset = DatasetEntity(id="ds_123", project_id="proj_456", name="Test DS", status="active", latest_published_version_number=0)
    mock_assets = [
        AssetEntity(id="ast_001", project_id="proj_456", filename="file1.png", uri="/f1", mime_type="image/png", file_size=500, sha256="hash_a")
    ]

    repo.get_version_by_id = AsyncMock(return_value=mock_version)
    repo.get_dataset_by_id = AsyncMock(return_value=mock_dataset)
    repo.get_all_assets_by_version = AsyncMock(return_value=mock_assets)
    repo.save_version = AsyncMock(side_effect=lambda v: v)
    repo.save_dataset = AsyncMock(side_effect=lambda d: d)

    use_case = PublishDatasetVersionUseCase(repo=repo)
    res = await use_case.execute("ver_001")

    assert res.status == "published"
    assert res.manifest_hash is not None
    assert len(res.manifest_hash) == 64
    assert res.published_at is not None
    assert mock_dataset.latest_published_version_number == 1
    repo.save_version.assert_called_once()
    repo.save_dataset.assert_called_once()


@pytest.mark.asyncio
async def test_list_version_assets_cursor_use_case():
    repo = MagicMock()
    mock_version = DatasetVersionEntity(id="ver_001", dataset_id="ds_123", version="v1.0.0")
    mock_assets = [
        AssetEntity(id="ast_002", project_id="p1", filename="img2.png", uri="/img2", mime_type="image/png", file_size=100, sha256="h2")
    ]

    repo.get_version_by_id = AsyncMock(return_value=mock_version)
    repo.list_assets_by_version_cursor = AsyncMock(return_value=(mock_assets, "ast_002"))

    use_case = ListVersionAssetsCursorUseCase(repo=repo)
    res = await use_case.execute("ver_001", limit=1, cursor_id="ast_001")

    assert len(res.items) == 1
    assert res.items[0].id == "ast_002"
    assert res.next_cursor == "ast_002"
    repo.list_assets_by_version_cursor.assert_called_once_with("ver_001", limit=1, cursor_id="ast_001")


# ============================================================================
# Phase 4: Lifecycle Use Cases (Archive Dataset & Retire Asset)
# ============================================================================


@pytest.mark.asyncio
async def test_archive_dataset_use_case_success():
    repo = MagicMock()
    mock_dataset = DatasetEntity(id="ds_123", project_id="p1", name="Active DS", status="active")

    repo.get_dataset_by_id = AsyncMock(return_value=mock_dataset)
    repo.save_dataset = AsyncMock(side_effect=lambda d: d)

    use_case = ArchiveDatasetUseCase(repo=repo)
    res = await use_case.execute("ds_123")

    assert res.status == "archived"
    repo.save_dataset.assert_called_once()


@pytest.mark.asyncio
async def test_create_version_on_archived_dataset_fails():
    repo = MagicMock()
    mock_dataset = DatasetEntity(id="ds_123", project_id="p1", name="Archived DS", status="archived")

    repo.get_dataset_by_id = AsyncMock(return_value=mock_dataset)

    use_case = CreateDatasetVersionUseCase(repo=repo)
    payload = DatasetVersionCreateDTO(version="v2.0.0")

    with pytest.raises(BadRequestException) as exc_info:
        await use_case.execute("ds_123", payload)

    assert "Cannot create version for dataset 'ds_123' with status 'archived'" in str(exc_info.value)


@pytest.mark.asyncio
async def test_retire_asset_with_linked_versions_fails():
    repo = MagicMock()
    mock_asset = AssetEntity(id="ast_001", project_id="p1", filename="f1.png", uri="/f1", mime_type="image/png", file_size=100, sha256="h1", status="READY")

    repo.get_asset_by_id = AsyncMock(return_value=mock_asset)
    repo.count_active_version_links_by_asset = AsyncMock(return_value=2)

    use_case = RetireAssetUseCase(repo=repo)

    with pytest.raises(BadRequestException) as exc_info:
        await use_case.execute("ast_001")

    assert "It is still linked to 2 dataset version(s)" in str(exc_info.value)


@pytest.mark.asyncio
async def test_retire_unlinked_asset_success():
    repo = MagicMock()
    mock_asset = AssetEntity(id="ast_002", project_id="p1", filename="f2.png", uri="/f2", mime_type="image/png", file_size=100, sha256="h2", status="READY")

    repo.get_asset_by_id = AsyncMock(return_value=mock_asset)
    repo.count_active_version_links_by_asset = AsyncMock(return_value=0)
    repo.save_asset = AsyncMock(side_effect=lambda a: a)

    use_case = RetireAssetUseCase(repo=repo)
    res = await use_case.execute("ast_002")

    assert res.status == "RETIRED"
    assert res.retired_at is not None
    repo.save_asset.assert_called_once()


# ============================================================================
# Phase 5: Transactional Outbox & Async Event Processing
# ============================================================================


@pytest.mark.asyncio
async def test_create_dataset_emits_outbox_event():
    from core.events.domain_event import DatasetCreatedEvent
    from modules.dataset.dtos.dataset_dtos import DatasetCreateDTO
    from modules.dataset.use_cases import CreateDatasetUseCase

    repo = AsyncMock()
    outbox_repo = AsyncMock()

    mock_saved = DatasetEntity(
        id="ds_123",
        project_id="proj_456",
        name="Outbox Dataset",
        status="active",
        created_by="user_789",
    )
    repo.save_dataset = AsyncMock(return_value=mock_saved)
    repo.save_version = AsyncMock(side_effect=lambda v: v)

    use_case = CreateDatasetUseCase(repo=repo, outbox_repo=outbox_repo)
    res = await use_case.execute("proj_456", DatasetCreateDTO(name="Outbox Dataset"))

    assert res.id == "ds_123"
    outbox_repo.save_event.assert_called_once()
    event_arg = outbox_repo.save_event.call_args[0][0]
    assert isinstance(event_arg, DatasetCreatedEvent)
    assert event_arg.payload["dataset_id"] == "ds_123"
    assert event_arg.payload["project_id"] == "proj_456"


@pytest.mark.asyncio
async def test_publish_version_emits_outbox_event():
    from core.events.domain_event import DatasetVersionPublishedEvent
    from modules.dataset.use_cases import PublishDatasetVersionUseCase

    repo = AsyncMock()
    outbox_repo = AsyncMock()

    mock_ver = DatasetVersionEntity(
        id="ver_111",
        dataset_id="ds_123",
        version="v1.0.0",
        version_number=1,
        status="draft",
    )
    mock_dataset = DatasetEntity(
        id="ds_123",
        project_id="proj_456",
        name="Test",
        status="active",
        latest_published_version_number=0,
    )

    repo.get_version_by_id = AsyncMock(return_value=mock_ver)
    repo.get_dataset_by_id = AsyncMock(return_value=mock_dataset)
    repo.get_all_assets_by_version = AsyncMock(return_value=[])
    repo.save_version = AsyncMock(side_effect=lambda v: v)
    repo.save_dataset = AsyncMock(side_effect=lambda d: d)

    use_case = PublishDatasetVersionUseCase(repo=repo, outbox_repo=outbox_repo)
    res = await use_case.execute("ver_111")

    assert res.status == "published"
    outbox_repo.save_event.assert_called_once()
    event_arg = outbox_repo.save_event.call_args[0][0]
    assert isinstance(event_arg, DatasetVersionPublishedEvent)
    assert event_arg.payload["version_id"] == "ver_111"
    assert event_arg.payload["dataset_id"] == "ds_123"


@pytest.mark.asyncio
async def test_finalize_asset_import_emits_outbox_event():
    from core.events.domain_event import AssetReadyEvent
    from modules.dataset.dtos.dataset_dtos import (
        FinalizeAssetImportItemDTO,
        FinalizeAssetImportRequestDTO,
    )
    from modules.dataset.use_cases import FinalizeAssetImportUseCase

    repo = AsyncMock()
    storage_provider = AsyncMock()
    outbox_repo = AsyncMock()

    mock_ver = DatasetVersionEntity(
        id="ver_111", dataset_id="ds_123", version="v1.0.0", status="draft"
    )
    mock_dataset = DatasetEntity(id="ds_123", project_id="proj_456", name="Test")

    repo.get_version_by_id = AsyncMock(return_value=mock_ver)
    repo.get_dataset_by_id = AsyncMock(return_value=mock_dataset)
    repo.find_asset_by_sha256 = AsyncMock(return_value=None)
    repo.save_asset = AsyncMock(side_effect=lambda a: a)
    repo.add_asset_to_version = AsyncMock()

    use_case = FinalizeAssetImportUseCase(
        repo=repo, storage_provider=storage_provider, outbox_repo=outbox_repo
    )

    payload = FinalizeAssetImportRequestDTO(
        items=[
            FinalizeAssetImportItemDTO(
                asset_id="ast_999",
                filename="test.jpg",
                storage_key="project-proj_456/assets/ast_999/test.jpg",
                mime_type="image/jpeg",
                file_size=1024,
                sha256="a" * 64,
            )
        ]
    )

    res = await use_case.execute("ver_111", payload)
    assert len(res.imported_assets) == 1
    assert res.new_assets_count == 1
    assert res.reused_assets_count == 0
    outbox_repo.save_event.assert_called_once()
    event_arg = outbox_repo.save_event.call_args[0][0]
    assert isinstance(event_arg, AssetReadyEvent)
    assert event_arg.payload["asset_id"] == "ast_999"


@pytest.mark.asyncio
async def test_finalize_asset_import_deduplicates_by_sha256():
    from modules.dataset.domain.entities import AssetEntity
    from modules.dataset.dtos.dataset_dtos import (
        FinalizeAssetImportItemDTO,
        FinalizeAssetImportRequestDTO,
    )
    from modules.dataset.use_cases import FinalizeAssetImportUseCase

    repo = AsyncMock()
    storage_provider = AsyncMock()

    mock_ver = DatasetVersionEntity(
        id="ver_111", dataset_id="ds_123", version="v1.0.0", status="draft"
    )
    mock_dataset = DatasetEntity(id="ds_123", project_id="proj_456", name="Test")
    existing_asset = AssetEntity(
        id="existing_001",
        project_id="proj_456",
        filename="original.jpg",
        uri="/bucket/orig.jpg",
        mime_type="image/jpeg",
        file_size=1024,
        sha256="a" * 64,
    )

    repo.get_version_by_id = AsyncMock(return_value=mock_ver)
    repo.get_dataset_by_id = AsyncMock(return_value=mock_dataset)
    repo.find_asset_by_sha256 = AsyncMock(return_value=existing_asset)
    repo.add_asset_to_version = AsyncMock()

    use_case = FinalizeAssetImportUseCase(
        repo=repo, storage_provider=storage_provider
    )

    payload = FinalizeAssetImportRequestDTO(
        items=[
            FinalizeAssetImportItemDTO(
                asset_id="new_id",
                filename="renamed.jpg",
                storage_key="project-proj_456/assets/new_id/renamed.jpg",
                mime_type="image/jpeg",
                file_size=1024,
                sha256="a" * 64,
            )
        ]
    )

    res = await use_case.execute("ver_111", payload)
    assert len(res.imported_assets) == 1
    assert res.imported_assets[0].id == "existing_001"
    assert res.reused_assets_count == 1
    assert res.new_assets_count == 0
    repo.add_asset_to_version.assert_called_once_with("ver_111", "existing_001")



@pytest.mark.asyncio
async def test_outbox_processor_dispatches_events():
    from core.events.models import OutboxEventModel
    from core.events.processor import OutboxProcessor

    processor = OutboxProcessor()
    dispatched = []

    async def sample_handler(payload):
        dispatched.append(payload)

    processor.register_handler("DatasetCreated", sample_handler)

    mock_session = AsyncMock()
    mock_event = OutboxEventModel(
        event_id="evt_001",
        event_type="DatasetCreated",
        aggregate_type="Dataset",
        aggregate_id="ds_123",
        payload={"dataset_id": "ds_123", "name": "Handled Dataset"},
        status="PENDING",
    )

    mock_outbox_repo = AsyncMock()
    mock_outbox_repo.fetch_pending_events = AsyncMock(return_value=[mock_event])
    mock_outbox_repo.mark_processed = AsyncMock()

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(
            "core.events.processor.SqlOutboxRepository",
            lambda session: mock_outbox_repo,
        )
        count = await processor.process_pending_batch(mock_session)

    assert count == 1
    assert len(dispatched) == 1
    assert dispatched[0]["dataset_id"] == "ds_123"
    mock_outbox_repo.mark_processed.assert_called_once_with("evt_001")


@pytest.mark.asyncio
async def test_update_dataset_use_case_success():
    from modules.dataset.dtos.dataset_dtos import DatasetUpdateDTO
    from modules.dataset.use_cases import UpdateDatasetUseCase

    repo = AsyncMock()
    mock_dataset = DatasetEntity(
        id="ds_100",
        project_id="proj_001",
        name="Old Name",
        description="Old Description",
        status="active",
    )
    repo.get_dataset_by_id = AsyncMock(return_value=mock_dataset)
    repo.save_dataset = AsyncMock(side_effect=lambda d: d)

    use_case = UpdateDatasetUseCase(repo=repo)
    res = await use_case.execute(
        "ds_100", DatasetUpdateDTO(name="New Name", description="New Description")
    )

    assert res.name == "New Name"
    assert res.description == "New Description"
    repo.save_dataset.assert_called_once()


@pytest.mark.asyncio
async def test_upload_version_assets_corrupted_image_fails():
    from modules.dataset.use_cases import UploadVersionAssetsUseCase

    repo = AsyncMock()
    mock_version = MagicMock(status="draft", dataset_id="ds_100")
    mock_dataset = MagicMock(project_id="proj_001")
    repo.get_version_by_id = AsyncMock(return_value=mock_version)
    repo.get_dataset_by_id = AsyncMock(return_value=mock_dataset)

    storage = AsyncMock()
    use_case = UploadVersionAssetsUseCase(repo=repo, storage_provider=storage)

    corrupted_files = [("corrupted.jpg", b"Invalid image content data", "image/jpeg")]

    with pytest.raises(BadRequestException) as exc_info:
        await use_case.execute("ver_100", corrupted_files)

    assert "bị hỏng hoặc không đúng định dạng" in str(exc_info.value)


@pytest.mark.asyncio
async def test_inherit_dataset_version_empty_target_success():
    from modules.dataset.dtos.dataset_dtos import InheritDatasetVersionRequestDTO
    from modules.dataset.use_cases import InheritDatasetVersionUseCase

    repo = AsyncMock()

    target_ver = MagicMock(id="ver_target", dataset_id="ds_100", status="draft", asset_count=2)
    source_ver = MagicMock(id="ver_source", dataset_id="ds_100", status="published", asset_count=2)

    repo.get_version_by_id = AsyncMock(side_effect=lambda vid: target_ver if vid == "ver_target" else source_ver)

    ast1 = MagicMock(id="ast_01")
    ast2 = MagicMock(id="ast_02")
    repo.get_all_assets_by_version = AsyncMock(side_effect=lambda vid: [ast1, ast2] if vid == "ver_source" else [])
    repo.add_asset_to_version = AsyncMock()

    use_case = InheritDatasetVersionUseCase(repo=repo)
    res = await use_case.execute("ver_target", InheritDatasetVersionRequestDTO(source_version_id="ver_source"))

    assert res.added_assets_count == 2
    assert res.reused_assets_count == 0
    assert repo.add_asset_to_version.call_count == 2


@pytest.mark.asyncio
async def test_inherit_dataset_version_non_empty_target_deduplicates():
    from modules.dataset.dtos.dataset_dtos import InheritDatasetVersionRequestDTO
    from modules.dataset.use_cases import InheritDatasetVersionUseCase

    repo = AsyncMock()

    target_ver = MagicMock(id="ver_target", dataset_id="ds_100", status="draft", asset_count=3)
    source_ver = MagicMock(id="ver_source", dataset_id="ds_100", status="published", asset_count=3)

    repo.get_version_by_id = AsyncMock(side_effect=lambda vid: target_ver if vid == "ver_target" else source_ver)

    ast1 = MagicMock(id="ast_01")
    ast2 = MagicMock(id="ast_02")
    ast3 = MagicMock(id="ast_03")

    # Target already has ast1 and ast2
    repo.get_all_assets_by_version = AsyncMock(
        side_effect=lambda vid: [ast1, ast2, ast3] if vid == "ver_source" else [ast1, ast2]
    )
    repo.add_asset_to_version = AsyncMock()

    use_case = InheritDatasetVersionUseCase(repo=repo)
    res = await use_case.execute("ver_target", InheritDatasetVersionRequestDTO(source_version_id="ver_source"))

    assert res.added_assets_count == 1
    assert res.reused_assets_count == 2
    repo.add_asset_to_version.assert_called_once_with("ver_target", "ast_03")


@pytest.mark.asyncio
async def test_inherit_published_target_version_fails():
    from modules.dataset.dtos.dataset_dtos import InheritDatasetVersionRequestDTO
    from modules.dataset.use_cases import InheritDatasetVersionUseCase

    repo = AsyncMock()

    target_ver = MagicMock(id="ver_target", dataset_id="ds_100", status="published")
    repo.get_version_by_id = AsyncMock(return_value=target_ver)

    use_case = InheritDatasetVersionUseCase(repo=repo)

    with pytest.raises(BadRequestException) as exc:
        await use_case.execute("ver_target", InheritDatasetVersionRequestDTO(source_version_id="ver_source"))

    assert "Only draft versions allow asset inheritance" in str(exc.value)




