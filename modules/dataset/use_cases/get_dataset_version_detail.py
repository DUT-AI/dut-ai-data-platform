from core.exceptions import NotFoundException
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.dtos.dataset_dtos import DatasetVersionResponseDTO


class GetDatasetVersionDetailUseCase:
    """Retrieves full details for a dataset version by ID."""

    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(self, version_id: str) -> DatasetVersionResponseDTO:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset version '{version_id}' not found.")
        return DatasetVersionResponseDTO.model_validate(version)

