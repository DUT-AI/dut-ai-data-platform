from core.config import s3_settings
from core.exceptions import NotFoundException
from core.storage.interface import IStorageProvider
from core.storage.url_builder import parse_storage_uri
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.dtos.dataset_dtos import AssetDownloadUrlResponseDTO


class GetAssetDownloadUrlUseCase:
    """Generates a presigned GET download URL for an asset."""

    def __init__(
        self, repo: IDatasetRepository, storage_provider: IStorageProvider
    ) -> None:
        self.repo = repo
        self.storage_provider = storage_provider

    async def execute(
        self, asset_id: str, expires_in_seconds: int = 3600
    ) -> AssetDownloadUrlResponseDTO:
        asset = await self.repo.get_asset_by_id(asset_id)
        if not asset:
            raise NotFoundException(f"Asset '{asset_id}' not found.")

        if asset.uri:
            bucket, storage_key = parse_storage_uri(
                asset.uri, default_bucket=s3_settings.default_bucket
            )
        else:
            bucket = s3_settings.default_bucket
            storage_key = (
                f"project-{asset.project_id}/assets/{asset.id}/{asset.filename}"
            )

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

