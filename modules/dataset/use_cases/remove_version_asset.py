from core.exceptions import BadRequestException, NotFoundException
from modules.dataset.domain.interfaces import IDatasetRepository


class RemoveVersionAssetUseCase:
    """Removes an asset association from a draft dataset version."""

    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(self, version_id: str, asset_id: str) -> None:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset Version '{version_id}' not found.")

        if version.status != "draft":
            raise BadRequestException(
                "Cannot remove assets from a published dataset version."
            )

        removed = await self.repo.remove_asset_from_version(version_id, asset_id)
        if not removed:
            raise NotFoundException(
                f"Asset '{asset_id}' is not associated with version '{version_id}'."
            )

