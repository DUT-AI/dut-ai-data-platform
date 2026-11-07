from core.exceptions import NotFoundException
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.dtos.dataset_dtos import AssetResponseDTO


class GetAssetDetailUseCase:
    """Retrieves full details for a single asset by ID."""

    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(self, asset_id: str) -> AssetResponseDTO:
        asset = await self.repo.get_asset_by_id(asset_id)
        if not asset:
            raise NotFoundException(f"Asset '{asset_id}' not found.")
        return AssetResponseDTO.model_validate(asset)

