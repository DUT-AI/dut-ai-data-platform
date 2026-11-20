from datetime import UTC, datetime

import pytest

from modules.snapshot.domain.entities import (
    ReleaseTagEntity,
    SnapshotEntity,
    SnapshotItemEntity,
    SnapshotManifestEntity,
)
from modules.snapshot.domain.exceptions import SnapshotImmutableError
from modules.snapshot.domain.value_objects import SplitRatios


def test_split_ratios_validation():
    # Valid ratios
    ratios = SplitRatios(train=0.7, validation=0.15, test=0.15)
    ratios.validate()
    assert ratios.to_dict() == {"train": 0.7, "validation": 0.15, "test": 0.15}

    # Sum != 1.0
    invalid_sum = SplitRatios(train=0.8, validation=0.15, test=0.15)
    with pytest.raises(ValueError, match="must sum to 1.0"):
        invalid_sum.validate()

    # Negative values
    negative_val = SplitRatios(train=-0.2, validation=0.6, test=0.6)
    with pytest.raises(ValueError, match="must be non-negative"):
        negative_val.validate()


def test_snapshot_lifecycle_transitions():
    snapshot = SnapshotEntity(
        project_id="proj_1",
        dataset_version_id="dsv_1",
        ontology_version_id="ont_1",
        version_name="v1.0.0",
        created_by=1001,
    )
    assert snapshot.status == "CREATING"
    snapshot.assert_mutable()

    now = datetime.now(UTC)
    snapshot.mark_ready(now)
    assert snapshot.status == "READY"
    assert snapshot.finalized_at == now

    # Once READY, mutating or marking ready again fails
    with pytest.raises(SnapshotImmutableError):
        snapshot.assert_mutable()
    with pytest.raises(SnapshotImmutableError):
        snapshot.mark_ready(now)

    # Archive
    snapshot.archive(now)
    assert snapshot.status == "ARCHIVED"
    assert snapshot.archived_at == now

    # Cannot archive already archived
    with pytest.raises(SnapshotImmutableError):
        snapshot.archive(now)


def test_snapshot_mark_failed():
    snapshot = SnapshotEntity(
        project_id="proj_1",
        dataset_version_id="dsv_1",
        ontology_version_id="ont_1",
        version_name="v1.0.0",
        created_by=1001,
    )
    snapshot.mark_failed("creation_timeout", "Job exceeded 60 minutes")
    assert snapshot.status == "FAILED"
    assert snapshot.error_code == "creation_timeout"
    assert snapshot.error_message == "Job exceeded 60 minutes"

    # Cannot archive from FAILED
    with pytest.raises(SnapshotImmutableError):
        snapshot.archive(datetime.now(UTC))


def test_snapshot_entities_instantiation():
    item = SnapshotItemEntity(
        snapshot_id="snap_1",
        asset_id="asset_1",
        split="train",
        item_checksum="abc123sha256",
    )
    assert item.annotation_revision_id is None
    assert len(item.id) == 26

    manifest = SnapshotManifestEntity(
        snapshot_id="snap_1",
        dataset_version_id="dsv_1",
        ontology_version_id="ont_1",
        asset_count=100,
        annotation_count=150,
        split_distribution={"train": {"count": 70, "ratio": 0.7}},
        class_distribution={"train": {"car": 50}},
        aggregate_checksum="agg123",
        storage_uri="s3://bucket/manifest.json",
    )
    assert manifest.asset_count == 100
    assert len(manifest.id) == 26

    tag = ReleaseTagEntity(
        project_id="proj_1",
        snapshot_id="snap_1",
        name="production",
        created_by=1001,
    )
    assert tag.name == "production"
    assert len(tag.id) == 26
