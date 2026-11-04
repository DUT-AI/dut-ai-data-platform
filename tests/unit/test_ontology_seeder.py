"""Unit tests for OntologyTemplateSeederService and CreateOntologyUseCase (User Story 2)."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from modules.ontology.domain.entities import OntologyEntity, OntologyVersionEntity
from modules.ontology.use_cases.ontologies import CreateOntologyUseCase
from modules.ontology.dtos import OntologyCreateDTO


@pytest.mark.asyncio
async def test_create_ontology_use_case_has_low_arity():
    """Verify CreateOntologyUseCase has at most 3 constructor dependencies."""
    repo = AsyncMock()
    versions = AsyncMock()
    seeder = AsyncMock()

    use_case = CreateOntologyUseCase(
        repo=repo,
        versions=versions,
        seeder=seeder,
    )

    created_ontology = OntologyEntity(project_id="prj_1", name="Test Ontology", id="onto_1")
    draft_version = OntologyVersionEntity(ontology_id="onto_1", version_no=1, name="Draft v1", id="ver_1")
    repo.add.return_value = created_ontology
    versions.add.return_value = draft_version

    dto = OntologyCreateDTO(name="Test Ontology")
    result = await use_case.execute("prj_1", dto)

    assert result.id == "onto_1"
    repo.add.assert_awaited_once()
    versions.add.assert_awaited_once()
    seeder.seed_from_project_template.assert_awaited_once_with("prj_1", created_ontology, draft_version)


@pytest.mark.asyncio
async def test_ontology_seeder_rolls_back_on_error():
    """Verify OntologyTemplateSeederService rolls back session when seeding encounters an exception."""
    from modules.ontology.services.seeder import OntologyTemplateSeederService

    session = AsyncMock()
    session.begin_nested = MagicMock()
    project_repo = AsyncMock()
    project_repo.get_by_id.side_effect = RuntimeError("Database connection lost")

    seeder = OntologyTemplateSeederService(
        session=session,
        project_repo=project_repo,
        catalog_repo=AsyncMock(),
        input_def_repo=AsyncMock(),
        output_def_repo=AsyncMock(),
        input_repo=AsyncMock(),
        output_repo=AsyncMock(),
        category_repo=AsyncMock(),
        version_repo=AsyncMock(),
    )

    onto = OntologyEntity(project_id="prj_1", name="Test", id="onto_1")
    ver = OntologyVersionEntity(ontology_id="onto_1", version_no=1, name="v1", id="ver_1")

    # The seeder handles errors gracefully by rolling back without raising or leaving corrupt state
    await seeder.seed_from_project_template("prj_1", onto, ver)
    session.rollback.assert_awaited_once()

