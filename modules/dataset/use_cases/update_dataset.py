from core.exceptions import BadRequestException, NotFoundException
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.dtos.dataset_dtos import (
    DatasetResponseDTO,
    DatasetUpdateDTO,
)


class UpdateDatasetUseCase:
    """Updates metadata (name, description, tags) of an active dataset."""

    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(
        self, dataset_id: str, payload: DatasetUpdateDTO
    ) -> DatasetResponseDTO:
        dataset = await self.repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundException(f"Dataset '{dataset_id}' not found.")

        if dataset.status == "archived":
            raise BadRequestException(f"Cannot update archived dataset '{dataset_id}'.")

        if payload.name is not None and payload.name.strip():
            dataset.name = payload.name.strip()
        if payload.description is not None:
            dataset.description = payload.description.strip() if payload.description else None
        if payload.tags is not None:
            dataset.tags = payload.tags

        saved = await self.repo.save_dataset(dataset)
        return DatasetResponseDTO.model_validate(saved)

