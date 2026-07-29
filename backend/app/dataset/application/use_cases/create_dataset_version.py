from datetime import UTC, datetime

from app.dataset.application.dtos import DatasetVersionCreateDTO
from domain.entities import DatasetVersionEntity
from domain.exceptions import NotFoundException
from domain.interfaces import IDatasetRepository
from shared.utils.id_generator import generate_ulid


class CreateDatasetVersionUseCase:
    def __init__(self, repo: IDatasetRepository):
        self.repo = repo

    async def execute(
        self, dataset_id: str, dto: DatasetVersionCreateDTO
    ) -> DatasetVersionEntity:
        dataset = await self.repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundException(f"Dataset '{dataset_id}' not found.")

        new_version = DatasetVersionEntity(
            id=generate_ulid(),
            dataset_id=dataset_id,
            version=dto.version,
            status="draft",
            asset_count=0,
            created_at=datetime.now(UTC),
        )
        return await self.repo.save_version(new_version)
