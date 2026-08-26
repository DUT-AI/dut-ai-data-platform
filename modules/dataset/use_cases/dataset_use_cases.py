import io
from collections.abc import Sequence

from core.config import s3_settings
from core.exceptions import BadRequestException, NotFoundException
from core.storage.interface import IStorageProvider
from core.storage.url_builder import parse_storage_uri
from core.utils.datetime_utils import now_utc
from core.utils.id_generator import generate_ulid
from modules.dataset.domain.entities import (
    AssetEntity,
    DatasetEntity,
    DatasetVersionEntity,
)
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.dtos.dataset_dtos import (
    AssetDownloadUrlResponseDTO,
    AssetResponseDTO,
    BatchUploadResultDTO,
    DatasetCreateDTO,
    DatasetResponseDTO,
    DatasetVersionCreateDTO,
    DatasetVersionResponseDTO,
)
from modules.dataset.services.metadata_extractor import AssetMetadataExtractor


class CreateDatasetUseCase:
    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(
        self, project_id: str, payload: DatasetCreateDTO
    ) -> DatasetResponseDTO:
        dataset = DatasetEntity(
            project_id=project_id,
            name=payload.name,
            description=payload.description,
        )
        saved = await self.repo.save_dataset(dataset)

        # Create initial default v1.0.0 draft version
        initial_version = DatasetVersionEntity(
            dataset_id=saved.id,
            version="v1.0.0",
            status="draft",
        )
        saved_ver = await self.repo.save_version(initial_version)
        saved.versions = [saved_ver]

        return DatasetResponseDTO.model_validate(saved)


class ListProjectDatasetsUseCase:
    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str) -> list[DatasetResponseDTO]:
        datasets = await self.repo.list_datasets_by_project(project_id)
        return [DatasetResponseDTO.model_validate(d) for d in datasets]


class GetDatasetDetailUseCase:
    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(self, dataset_id: str) -> DatasetResponseDTO:
        dataset = await self.repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundException(f"Dataset '{dataset_id}' not found.")
        return DatasetResponseDTO.model_validate(dataset)


class CreateDatasetVersionUseCase:
    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(
        self, dataset_id: str, payload: DatasetVersionCreateDTO
    ) -> DatasetVersionResponseDTO:
        dataset = await self.repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundException(f"Dataset '{dataset_id}' not found.")

        new_version = DatasetVersionEntity(
            dataset_id=dataset_id,
            version=payload.version,
            status="draft",
        )
        saved = await self.repo.save_version(new_version)
        return DatasetVersionResponseDTO.model_validate(saved)


class GetDatasetVersionDetailUseCase:
    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(self, version_id: str) -> DatasetVersionResponseDTO:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset version '{version_id}' not found.")
        return DatasetVersionResponseDTO.model_validate(version)


class PublishDatasetVersionUseCase:
    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(self, version_id: str) -> DatasetVersionResponseDTO:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset version '{version_id}' not found.")
        if version.status == "published":
            raise BadRequestException("Version is already published.")

        version.status = "published"
        version.published_at = now_utc()
        saved = await self.repo.save_version(version)
        return DatasetVersionResponseDTO.model_validate(saved)


class UploadVersionAssetsUseCase:
    def __init__(
        self, repo: IDatasetRepository, storage_provider: IStorageProvider
    ) -> None:
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


class RemoveVersionAssetUseCase:
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


class ListVersionAssetsUseCase:
    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(
        self, version_id: str, limit: int = 100, offset: int = 0
    ) -> Sequence[AssetResponseDTO]:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset Version '{version_id}' not found.")

        assets = await self.repo.list_assets_by_version(
            version_id, limit=limit, offset=offset
        )
        return [AssetResponseDTO.model_validate(a) for a in assets]


class GetAssetDetailUseCase:
    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(self, asset_id: str) -> AssetResponseDTO:
        asset = await self.repo.get_asset_by_id(asset_id)
        if not asset:
            raise NotFoundException(f"Asset '{asset_id}' not found.")
        return AssetResponseDTO.model_validate(asset)


class GetAssetDownloadUrlUseCase:
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
