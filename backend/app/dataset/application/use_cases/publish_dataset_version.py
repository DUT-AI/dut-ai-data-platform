from datetime import UTC, datetime

from domain.entities import DatasetVersionEntity
from domain.exceptions import BadRequestException, NotFoundException
from domain.interfaces import IDatasetRepository


class PublishDatasetVersionUseCase:
    def __init__(self, repo: IDatasetRepository):
        self.repo = repo

    async def execute(self, version_id: str) -> DatasetVersionEntity:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset Version '{version_id}' not found.")

        if version.status != "draft":
            raise BadRequestException(
                f"Cannot publish version '{version_id}' with status '{version.status}'. Only draft versions can be published."
            )

        updated_version = DatasetVersionEntity(
            id=version.id,
            dataset_id=version.dataset_id,
            version=version.version,
            status="published",
            asset_count=version.asset_count,
            created_at=version.created_at,
            published_at=datetime.now(UTC),
            assets=version.assets,
        )
        return await self.repo.save_version(updated_version)
