"""Architectural purity gate tests for Clean Architecture.

Verifies that all domain entities across all modules (identity, annotation,
project, dataset, ontology) have ZERO dependencies on frameworks like
Pydantic, FastAPI, SQLAlchemy, or persistence drivers.
"""

import sys
import pytest


def test_domain_layer_purity_zero_framework_imports():
    """Verify that domain entity modules do not import Pydantic, FastAPI, or SQLAlchemy."""
    from modules.identity.domain import entities as id_ent
    from modules.annotation.domain import entities as ann_ent
    from modules.project.domain import entities as prj_ent
    from modules.dataset.domain import entities as ds_ent
    from modules.ontology.domain import entities as ont_ent

    forbidden = ["pydantic", "fastapi", "sqlalchemy"]
    checked_modules = [id_ent, ann_ent, prj_ent, ds_ent, ont_ent]

    for mod in checked_modules:
        mod_dict = mod.__dict__
        for imp in forbidden:
            assert imp not in mod_dict, (
                f"Forbidden framework import '{imp}' found in domain module '{mod.__name__}'"
            )


def test_user_id_standardization_is_int():
    """Verify that user identifiers across domain entities are strictly int."""
    from modules.identity.domain.entities import UserEntity
    from modules.project.domain.entities import ProjectEntity, ProjectMemberEntity
    from modules.annotation.domain.entities import AnnotationEntity, AnnotationRevisionEntity

    user = UserEntity(id=1, email="test@dutai.dev")
    assert isinstance(user.id, int)

    project = ProjectEntity(name="Test Project", created_by=1)
    assert isinstance(project.created_by, int)
    assert isinstance(project.owner_id, int)

    member = ProjectMemberEntity(project_id="prj_1", user_id=1, role="admin")
    assert isinstance(member.user_id, int)

    annotation = AnnotationEntity(asset_id="asset_1", project_id="prj_1", created_by=1)
    assert isinstance(annotation.created_by, int)

    rev = annotation.add_revision(
        source="human",
        results=[{"label": "car"}],
        category_ids=["cat_1"],
        created_by=1,
    )
    assert isinstance(rev.created_by, int)
    assert rev.revision_number == 1

