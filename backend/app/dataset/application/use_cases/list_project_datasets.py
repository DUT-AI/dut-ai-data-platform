from collections.abc import Sequence

from domain.entities import DatasetEntity
from domain.interfaces import IDatasetRepository


class ListProjectDatasetsUseCase:
    def __init__(self, repo: IDatasetRepository):
        self.repo = repo

    async def execute(self, project_id: str) -> Sequence[DatasetEntity]:
        return await self.repo.list_datasets_by_project(project_id)
