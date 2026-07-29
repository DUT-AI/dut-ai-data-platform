from collections.abc import Sequence

from domain.entities import AssetEntity
from domain.exceptions import NotFoundException
from domain.interfaces import IDatasetRepository


class ListVersionAssetsUseCase:
    def __init__(self, repo: IDatasetRepository):
        self.repo = repo

    async def execute(
        self, version_id: str, limit: int = 100, offset: int = 0
    ) -> Sequence[AssetEntity]:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset Version '{version_id}' not found.")

        return await self.repo.list_assets_by_version(
            version_id, limit=limit, offset=offset
        )
