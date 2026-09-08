import pytest
from modules.dataset.domain.entities import AssetEntity, DatasetEntity, DatasetVersionEntity
from modules.dataset.dtos.dataset_dtos import (
    AssetResponseDTO,
    DatasetCreateDTO,
    DatasetResponseDTO,
    DatasetVersionResponseDTO,
)


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
