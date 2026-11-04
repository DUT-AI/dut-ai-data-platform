from core.exceptions import NotFoundException
from core.utils.datetime_utils import now_utc
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.domain.policies import AssetDeletionPolicy
from modules.dataset.dtos.dataset_dtos import AssetResponseDTO


class RetireAssetUseCase:
    """Marks an unlinked asset as RETIRED in accordance with AssetDeletionPolicy."""

    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(self, asset_id: str) -> AssetResponseDTO:
        asset = await self.repo.get_asset_by_id(asset_id)
        if not asset:
            raise NotFoundException(f"Asset '{asset_id}' not found.")

        if asset.status == "RETIRED":
            return AssetResponseDTO.model_validate(asset)

        link_count = await self.repo.count_active_version_links_by_asset(asset_id)
        AssetDeletionPolicy.ensure_can_retire(asset, link_count)

        asset.status = "RETIRED"
        asset.retired_at = now_utc()
        saved_asset = await self.repo.save_asset(asset)

        return AssetResponseDTO.model_validate(saved_asset)

