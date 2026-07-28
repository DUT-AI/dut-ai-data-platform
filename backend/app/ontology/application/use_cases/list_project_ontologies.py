from collections.abc import Sequence

from domain.entities import OntologyEntity
from domain.interfaces import IOntologyRepository


class ListProjectOntologiesUseCase:
    def __init__(self, repo: IOntologyRepository):
        self.repo = repo

    async def execute(self, project_id: str) -> Sequence[OntologyEntity]:
        return await self.repo.list_ontologies_by_project(project_id)
