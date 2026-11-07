from core.exceptions import NotFoundException
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.dtos.dataset_dtos import DatasetResponseDTO


class ArchiveDatasetUseCase:
    """Soft-deletes or archives a dataset."""

    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(self, dataset_id: str) -> DatasetResponseDTO:
        dataset = await self.repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundException(f"Dataset '{dataset_id}' not found.")

        if dataset.status != "archived":
            dataset.status = "archived"
            dataset = await self.repo.save_dataset(dataset)

        return DatasetResponseDTO.model_validate(dataset)

