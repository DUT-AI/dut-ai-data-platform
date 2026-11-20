from datetime import UTC, datetime

import pytest

from modules.export.domain.entities import ExportItemEntity, ExportPackageEntity
from modules.export.domain.exceptions import (
    ExportPackageImmutableError,
)
from modules.export.domain.value_objects import (
    ExportFormatType,
    ExportStatus,
    MediaMode,
)


def test_export_package_entity_initialization():
    package = ExportPackageEntity(
        project_id="prj_01",
        snapshot_id="snp_01",
        format=ExportFormatType.YOLO,
        created_by=42,
    )

    assert package.id is not None
    assert package.project_id == "prj_01"
    assert package.snapshot_id == "snp_01"
    assert package.format == ExportFormatType.YOLO
    assert package.created_by == 42
    assert isinstance(package.created_by, int)
    assert package.media_mode == MediaMode.LABELS_ONLY
    assert package.annotated_only is False
    assert package.status == ExportStatus.PROCESSING
    assert package.storage_uri is None
    assert package.checksum is None
    assert package.file_size_bytes is None
    assert package.item_count == 0
    assert package.finalized_at is None


def test_export_package_mark_ready():
    package = ExportPackageEntity(
        project_id="prj_01",
        snapshot_id="snp_01",
        format=ExportFormatType.YOLO,
        created_by=42,
    )

    now = datetime.now(UTC)
    package.mark_ready(
        storage_uri="s3://bucket/test.zip",
        checksum="abcdef123456",
        file_size_bytes=1024,
        item_count=10,
        finalized_at=now,
    )

    assert package.status == ExportStatus.READY
    assert package.storage_uri == "s3://bucket/test.zip"
    assert package.checksum == "abcdef123456"
    assert package.file_size_bytes == 1024
    assert package.item_count == 10
    assert package.finalized_at == now

    # Marking ready again should raise ExportPackageImmutableError
    with pytest.raises(ExportPackageImmutableError):
        package.mark_ready(
            storage_uri="s3://bucket/test2.zip",
            checksum="different",
            file_size_bytes=2048,
            item_count=20,
        )


def test_export_package_mark_failed():
    package = ExportPackageEntity(
        project_id="prj_01",
        snapshot_id="snp_01",
        format=ExportFormatType.YOLO,
        created_by=42,
    )

    package.mark_failed(
        error_code="EXPORT_PROCESSING_FAILED",
        error_message="Worker encountered memory limit",
    )

    assert package.status == ExportStatus.FAILED
    assert package.error_code == "EXPORT_PROCESSING_FAILED"
    assert package.error_message == "Worker encountered memory limit"
    assert package.finalized_at is not None

    # Marking failed again should raise ExportPackageImmutableError
    with pytest.raises(ExportPackageImmutableError):
        package.mark_failed(
            error_code="AGAIN",
            error_message="Should fail",
        )


def test_export_item_entity_creation():
    item = ExportItemEntity(
        export_package_id="pkg_01",
        source_asset_id="asset_01",
        source_annotation_revision_id="rev_01",
        target_path="labels/train/asset_01.txt",
        split="train",
        checksum="sha256hash",
        metadata={"num_labels": 2},
    )

    assert item.id is not None
    assert item.export_package_id == "pkg_01"
    assert item.source_asset_id == "asset_01"
    assert item.source_annotation_revision_id == "rev_01"
    assert item.target_path == "labels/train/asset_01.txt"
    assert item.split == "train"
    assert item.checksum == "sha256hash"
    assert item.metadata["num_labels"] == 2


def test_domain_purity_export_entities():
    import modules.export.domain.entities as mod

    forbidden = ["fastapi", "pydantic", "sqlalchemy"]
    for imp in forbidden:
        assert imp not in mod.__dict__
