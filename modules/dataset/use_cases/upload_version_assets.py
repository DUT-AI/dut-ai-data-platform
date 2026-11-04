import io

from core.config import s3_settings
from core.exceptions import BadRequestException, NotFoundException
from core.storage.interface import IStorageProvider
from core.utils.id_generator import generate_ulid
from modules.dataset.domain.entities import AssetEntity
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.dtos.dataset_dtos import (
    AssetResponseDTO,
    BatchUploadResultDTO,
)
from modules.dataset.services.metadata_extractor import AssetMetadataExtractor


class UploadVersionAssetsUseCase:
    """Uploads file payloads directly into storage and binds created assets to a draft dataset version."""

    def __init__(
        self, repo: IDatasetRepository, storage_provider: IStorageProvider
    ) -> None:
        self.repo = repo
        self.storage_provider = storage_provider

    async def execute(
        self,
        version_id: str,
        files: list[tuple[str, bytes, str | None]],
        created_by: int | None = None,
    ) -> BatchUploadResultDTO:
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
        uploaded_assets: list[AssetEntity] = []
        reused_count = 0
        new_count = 0

        for filename, content, mime_type in files:
            if not filename or len(content) == 0:
                continue

            try:
                final_mime_type, metadata = AssetMetadataExtractor.extract_metadata(
                    filename, content, mime_type
                )
            except ValueError as e:
                raise BadRequestException(str(e)) from e

            sha256_hash = AssetMetadataExtractor.calculate_sha256(content)

            # Deduplication Check (Project-scoped)
            existing_asset = await self.repo.find_asset_by_sha256(
                project_id, sha256_hash
            )

            if existing_asset:
                asset = existing_asset
                reused_count += 1
            else:
                asset_id = generate_ulid()
                storage_key = f"project-{project_id}/assets/{asset_id}/{filename}"
                bucket = s3_settings.default_bucket

                # Upload object to MinIO S3
                uri = await self.storage_provider.upload(
                    bucket=bucket,
                    key=storage_key,
                    data=io.BytesIO(content),
                    content_type=final_mime_type,
                )

                new_asset = AssetEntity(
                    id=asset_id,
                    project_id=project_id,
                    filename=filename,
                    uri=uri,
                    mime_type=final_mime_type,
                    file_size=len(content),
                    sha256=sha256_hash,
                    metadata=metadata,
                    created_by=created_by,
                )
                asset = await self.repo.save_asset(new_asset)
                new_count += 1

            # Link asset to version
            await self.repo.add_asset_to_version(version_id, asset.id)
            uploaded_assets.append(asset)

        return BatchUploadResultDTO(
            uploaded_assets=[
                AssetResponseDTO.model_validate(a) for a in uploaded_assets
            ],
            reused_assets_count=reused_count,
            new_assets_count=new_count,
        )

