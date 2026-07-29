from domain.entities import DatasetVersionEntity
from domain.exceptions import NotFoundException
from domain.interfaces import IDatasetRepository


class GetDatasetVersionDetailUseCase:
    def __init__(self, repo: IDatasetRepository):
        self.repo = repo

    async def execute(self, version_id: str) -> DatasetVersionEntity:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset Version '{version_id}' not found.")
        return version
