from domain.entities import AssetEntity
from domain.exceptions import NotFoundException
from domain.interfaces import IDatasetRepository


class GetAssetDetailUseCase:
    def __init__(self, repo: IDatasetRepository):
        self.repo = repo

    async def execute(self, asset_id: str) -> AssetEntity:
        asset = (
            await self.repo.get_asset_id(asset_id)
            if hasattr(self.repo, "get_asset_id")
            else await self.repo.get_asset_by_id(asset_id)
        )
        if not asset:
            raise NotFoundException(f"Asset '{asset_id}' not found.")
        return asset
