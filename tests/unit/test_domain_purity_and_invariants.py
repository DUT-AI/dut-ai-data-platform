"""Unit tests for Domain Purity and Aggregate Invariants (User Story 1)."""

import pytest
from core.exceptions import InvariantViolationError


def test_annotation_aggregate_add_revision_sequential():
    """Verify AnnotationEntity enforces sequential revision numbers directly in domain."""
    from modules.annotation.domain.entities import AnnotationEntity

    anno = AnnotationEntity(asset_id="asset_1", project_id="prj_1", created_by=101)
    assert anno.latest_revision is None

    # First revision
    rev1 = anno.add_revision(
        source="human",
        results=[{"type": "bbox", "coordinates": [10, 10, 50, 50]}],
        category_ids=["cat_1"],
        created_by=101,
    )
    assert rev1.revision_number == 1
    assert rev1.created_by == 101
    assert anno.latest_revision == rev1
    assert len(anno.revisions) == 1

    # Second revision
    rev2 = anno.add_revision(
        source="machine",
        results=[{"type": "bbox", "coordinates": [12, 12, 52, 52]}],
        category_ids=["cat_1", "cat_2"],
        created_by=102,
    )
    assert rev2.revision_number == 2
    assert rev2.created_by == 102
    assert anno.latest_revision == rev2
    assert len(anno.revisions) == 2


def test_dataset_version_immutability():
    """Verify DatasetVersionEntity enforces immutability once published."""
    from modules.dataset.domain.entities import DatasetVersionEntity, AssetEntity

    version = DatasetVersionEntity(
        dataset_id="ds_1",
        version="v1.0.0",
        version_number=1,
        status="published",
    )
    assert version.status == "published"

    with pytest.raises(InvariantViolationError):
        version.assert_mutable()


def test_identity_pure_dataclasses_and_int_ids():
    """Verify UserEntity and UserLoginMetadataEntity are pure dataclasses with int IDs."""
    from modules.identity.domain.entities import UserEntity, UserLoginMetadataEntity
    from datetime import datetime, UTC

    user = UserEntity(id=42, email="developer@dutai.dev", name="Developer")
    assert isinstance(user.id, int)
    assert user.role == "user"

    now = datetime.now(UTC)
    meta = UserLoginMetadataEntity(user_id=42, last_login_at=now)
    assert isinstance(meta.user_id, int)


def test_project_entity_int_user_identifiers():
    """Verify ProjectEntity and ProjectMemberEntity strictly use int for user references."""
    from modules.project.domain.entities import ProjectEntity, ProjectMemberEntity

    project = ProjectEntity(name="CV Project", created_by=99)
    assert isinstance(project.created_by, int)
    assert project.owner_id == 99

    member = ProjectMemberEntity(project_id="prj_1", user_id=99, role="owner")
    assert isinstance(member.user_id, int)

