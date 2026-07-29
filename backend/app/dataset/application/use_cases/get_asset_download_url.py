from app.config import settings
from app.dataset.application.dtos import AssetDownloadUrlResponseDTO
from domain.exceptions import NotFoundException
from domain.interfaces import IDatasetRepository, IStorageProvider


class GetAssetDownloadUrlUseCase:
    def __init__(self, repo: IDatasetRepository, storage_provider: IStorageProvider):
        self.repo = repo
        self.storage_provider = storage_provider

    async def execute(
        self, asset_id: str, expires_in_seconds: int = 3600
    ) -> AssetDownloadUrlResponseDTO:
        asset = await self.repo.get_asset_by_id(asset_id)
        if not asset:
            raise NotFoundException(f"Asset '{asset_id}' not found.")

        bucket = settings.default_bucket
        storage_key = f"project-{asset.project_id}/assets/{asset.id}/{asset.filename}"

        download_url = await self.storage_provider.get_presigned_url(
            bucket=bucket,
            key=storage_key,
            expires=expires_in_seconds,
        )

        return AssetDownloadUrlResponseDTO(
            asset_id=asset.id,
            filename=asset.filename,
            download_url=download_url,
            expires_in_seconds=expires_in_seconds,
        )
