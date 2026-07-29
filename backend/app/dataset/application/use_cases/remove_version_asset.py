from domain.exceptions import BadRequestException, NotFoundException
from domain.interfaces import IDatasetRepository


class RemoveVersionAssetUseCase:
    def __init__(self, repo: IDatasetRepository):
        self.repo = repo

    async def execute(self, version_id: str, asset_id: str) -> bool:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset Version '{version_id}' not found.")

        if version.status != "draft":
            raise BadRequestException(
                f"Cannot remove assets from version '{version_id}' with status '{version.status}'. Only draft versions allow asset removal."
            )

        deleted = await self.repo.remove_asset_from_version(version_id, asset_id)
        if not deleted:
            raise NotFoundException(
                f"Asset '{asset_id}' is not linked to dataset version '{version_id}'."
            )
        return True
