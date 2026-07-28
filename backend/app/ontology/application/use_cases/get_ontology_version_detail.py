from domain.entities import OntologyVersionEntity
from domain.exceptions import NotFoundException
from domain.interfaces import IOntologyRepository


class GetOntologyVersionDetailUseCase:
    def __init__(self, repo: IOntologyRepository):
        self.repo = repo

    async def execute(self, version_id: str) -> OntologyVersionEntity:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Ontology Version '{version_id}' not found.")
        return version
