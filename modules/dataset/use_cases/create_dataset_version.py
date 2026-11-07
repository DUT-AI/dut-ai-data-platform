from core.exceptions import BadRequestException, NotFoundException
from modules.dataset.domain.entities import DatasetVersionEntity
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.dtos.dataset_dtos import (
    DatasetVersionCreateDTO,
    DatasetVersionResponseDTO,
)


class CreateDatasetVersionUseCase:
    """Creates a new draft version for a dataset."""

    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(
        self, dataset_id: str, payload: DatasetVersionCreateDTO
    ) -> DatasetVersionResponseDTO:
        dataset = await self.repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundException(f"Dataset '{dataset_id}' not found.")

        if dataset.status != "active":
            raise BadRequestException(
                f"Cannot create version for dataset '{dataset_id}' with status '{dataset.status}'."
            )

        new_version = DatasetVersionEntity(
            dataset_id=dataset_id,
            version=payload.version,
            status="draft",
        )
        saved = await self.repo.save_version(new_version)
        return DatasetVersionResponseDTO.model_validate(saved)

