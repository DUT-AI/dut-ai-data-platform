from core.exceptions import NotFoundException
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.dtos.dataset_dtos import DatasetVersionResponseDTO


class ListDatasetVersionsUseCase:
    """Lists all versions of a specific dataset."""

    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(self, dataset_id: str) -> list[DatasetVersionResponseDTO]:
        dataset = await self.repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundException(f"Dataset '{dataset_id}' not found.")
        return [
            DatasetVersionResponseDTO.model_validate(v)
            for v in (dataset.versions or [])
        ]

