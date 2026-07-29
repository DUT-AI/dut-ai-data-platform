import io

from app.config import settings
from app.dataset.application.dtos import AssetResponseDTO, BatchUploadResultDTO
from app.dataset.infrastructure.metadata_extractor import AssetMetadataExtractor
from domain.entities import AssetEntity
from domain.exceptions import BadRequestException, NotFoundException
from domain.interfaces import IDatasetRepository, IStorageProvider
from shared.utils.id_generator import generate_ulid


class UploadVersionAssetsUseCase:
    def __init__(self, repo: IDatasetRepository, storage_provider: IStorageProvider):
        self.repo = repo
        self.storage_provider = storage_provider

    async def execute(
        self, version_id: str, files: list[tuple[str, bytes, str | None]]
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

            sha256_hash = AssetMetadataExtractor.calculate_sha256(content)

            # Deduplication Check
            existing_asset = await self.repo.find_asset_by_sha256(
                project_id, sha256_hash
            )

            if existing_asset:
                asset = existing_asset
                reused_count += 1
            else:
                asset_id = generate_ulid()
                final_mime_type, metadata = AssetMetadataExtractor.extract_metadata(
                    filename, content, mime_type
                )
                storage_key = f"project-{project_id}/assets/{asset_id}/{filename}"
                bucket = settings.default_bucket

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
