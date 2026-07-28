from domain.entities import OntologyVersionEntity
from domain.exceptions import ConflictException, NotFoundException
from domain.interfaces import IOntologyRepository


class CloneOntologyVersionUseCase:
    def __init__(self, repo: IOntologyRepository):
        self.repo = repo

    async def execute(
        self, source_version_id: str, new_version_name: str
    ) -> OntologyVersionEntity:
        source_ver = await self.repo.get_version_by_id(source_version_id)
        if not source_ver:
            raise NotFoundException(
                f"Source Ontology Version '{source_version_id}' not found."
            )

        existing_versions = await self.repo.list_versions_by_ontology(
            source_ver.ontology_id
        )
        if any(v.version == new_version_name for v in existing_versions):
            raise ConflictException(
                f"Version '{new_version_name}' already exists in this ontology."
            )

        return await self.repo.clone_version(source_version_id, new_version_name)
