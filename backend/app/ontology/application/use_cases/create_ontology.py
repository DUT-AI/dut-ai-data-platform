from datetime import UTC, datetime

from app.ontology.application.dtos import OntologyCreateDTO
from domain.entities import OntologyEntity, OntologyVersionEntity
from domain.interfaces import IOntologyRepository
from shared.utils.id_generator import generate_ulid


class CreateOntologyUseCase:
    def __init__(self, repo: IOntologyRepository):
        self.repo = repo

    async def execute(self, project_id: str, dto: OntologyCreateDTO) -> OntologyEntity:
        new_ontology = OntologyEntity(
            id=generate_ulid(),
            project_id=project_id,
            name=dto.name,
            description=dto.description,
            status="active",
        )
        saved_ontology = await self.repo.save_ontology(new_ontology)

        # Create default v1.0.0 draft version
        initial_version = OntologyVersionEntity(
            id=generate_ulid(),
            ontology_id=saved_ontology.id,
            version="v1.0.0",
            status="draft",
            created_at=datetime.now(UTC),
        )
        saved_ver = await self.repo.save_version(initial_version)
        saved_ontology.versions = [saved_ver]

        return saved_ontology
