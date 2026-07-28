from app.ontology.application.dtos import OntologyVersionCreateDTO
from domain.entities import OntologyVersionEntity
from domain.exceptions import ConflictException, NotFoundException
from domain.interfaces import IOntologyRepository
from shared.utils.id_generator import generate_ulid


class CreateOntologyVersionUseCase:
    def __init__(self, repo: IOntologyRepository):
        self.repo = repo

    async def execute(
        self, ontology_id: str, dto: OntologyVersionCreateDTO
    ) -> OntologyVersionEntity:
        ontology = await self.repo.get_ontology_by_id(ontology_id)
        if not ontology:
            raise NotFoundException(f"Ontology '{ontology_id}' not found.")

        existing_versions = await self.repo.list_versions_by_ontology(ontology_id)
        if any(v.version == dto.version for v in existing_versions):
            raise ConflictException(
                f"Version '{dto.version}' already exists for ontology '{ontology_id}'."
            )

        new_version = OntologyVersionEntity(
            id=generate_ulid(),
            ontology_id=ontology_id,
            version=dto.version,
            status="draft",
        )
        return await self.repo.save_version(new_version)
