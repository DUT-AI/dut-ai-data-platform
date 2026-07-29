from domain.entities import DatasetEntity
from domain.exceptions import NotFoundException
from domain.interfaces import IDatasetRepository


class GetDatasetDetailUseCase:
    def __init__(self, repo: IDatasetRepository):
        self.repo = repo

    async def execute(self, dataset_id: str) -> DatasetEntity:
        dataset = await self.repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundException(f"Dataset '{dataset_id}' not found.")
        return dataset
