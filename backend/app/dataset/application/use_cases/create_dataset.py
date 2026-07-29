from datetime import UTC, datetime

from app.dataset.application.dtos import DatasetCreateDTO
from domain.entities import DatasetEntity, DatasetVersionEntity
from domain.interfaces import IDatasetRepository
from shared.utils.id_generator import generate_ulid


class CreateDatasetUseCase:
    def __init__(self, repo: IDatasetRepository):
        self.repo = repo

    async def execute(self, project_id: str, dto: DatasetCreateDTO) -> DatasetEntity:
        new_dataset = DatasetEntity(
            id=generate_ulid(),
            project_id=project_id,
            name=dto.name,
            description=dto.description,
            status="active",
        )
        saved_dataset = await self.repo.save_dataset(new_dataset)

        # Auto-create v1.0.0 draft version
        initial_version = DatasetVersionEntity(
            id=generate_ulid(),
            dataset_id=saved_dataset.id,
            version="v1.0.0",
            status="draft",
            asset_count=0,
            created_at=datetime.now(UTC),
        )
        saved_ver = await self.repo.save_version(initial_version)
        saved_dataset.versions = [saved_ver]

        return saved_dataset
