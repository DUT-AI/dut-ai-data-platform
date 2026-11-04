from core.config import s3_settings
from core.exceptions import BadRequestException, NotFoundException
from core.storage.interface import IStorageProvider
from core.utils.id_generator import generate_ulid
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.dtos.dataset_dtos import (
    PrepareUploadRequestDTO,
    PrepareUploadResponseDTO,
    PresignedUploadUrlItemDTO,
)


class PrepareAssetUploadUseCase:
    """Generates batch presigned upload URLs for asset files."""

    def __init__(
        self, repo: IDatasetRepository, storage_provider: IStorageProvider
    ) -> None:
        self.repo = repo
        self.storage_provider = storage_provider

    async def execute(
        self,
        version_id: str,
        payload: PrepareUploadRequestDTO,
        expires_in_seconds: int = 3600,
    ) -> PrepareUploadResponseDTO:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset Version '{version_id}' not found.")

        if version.status != "draft":
            raise BadRequestException(
                f"Cannot upload assets to version '{version_id}' with status '{version.status}'. Only draft versions allow asset uploads."
            )

        dataset = await self.repo.get_dataset_by_id(version.dataset_id)
        if not dataset:
            raise NotFoundException(f"Parent dataset '{version.dataset_id}' not found.")

        project_id = dataset.project_id
        bucket = s3_settings.default_bucket
        items: list[PresignedUploadUrlItemDTO] = []

        for f in payload.files:
            asset_id = generate_ulid()
            storage_key = f"project-{project_id}/assets/{asset_id}/{f.filename}"
            upload_url = await self.storage_provider.get_presigned_upload_url(
                bucket=bucket,
                key=storage_key,
                content_type=f.content_type,
                expires=expires_in_seconds,
            )
            items.append(
                PresignedUploadUrlItemDTO(
                    filename=f.filename,
                    asset_id=asset_id,
                    storage_key=storage_key,
                    upload_url=upload_url,
                    expires_in_seconds=expires_in_seconds,
                )
            )

        return PrepareUploadResponseDTO(items=items)

