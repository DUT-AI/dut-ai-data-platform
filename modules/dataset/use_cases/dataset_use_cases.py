import io
from collections.abc import Sequence

from core.config import s3_settings
from core.events.domain_event import (
    AssetReadyEvent,
    DatasetCreatedEvent,
    DatasetVersionPublishedEvent,
)
from core.events.outbox import IOutboxRepository
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
from modules.dataset.domain.policies import AssetDeletionPolicy, DatasetVersionPolicy
from modules.dataset.dtos.dataset_dtos import (
    AssetDownloadUrlResponseDTO,
    AssetResponseDTO,
    BatchUploadResultDTO,
    CursorPageAssetResponseDTO,
    DatasetCreateDTO,
    DatasetResponseDTO,
    DatasetUpdateDTO,
    DatasetVersionCreateDTO,
    DatasetVersionResponseDTO,
    FinalizeAssetImportRequestDTO,
    FinalizeAssetImportResponseDTO,
    InheritDatasetVersionRequestDTO,
    InheritDatasetVersionResponseDTO,
    PrepareUploadRequestDTO,
    PrepareUploadResponseDTO,
    PresignedUploadUrlItemDTO,
)
from modules.dataset.services.metadata_extractor import AssetMetadataExtractor


class CreateDatasetUseCase:
    def __init__(
        self, repo: IDatasetRepository, outbox_repo: IOutboxRepository | None = None
    ) -> None:
        self.repo = repo
        self.outbox_repo = outbox_repo

    async def execute(
        self, project_id: str, payload: DatasetCreateDTO
    ) -> DatasetResponseDTO:
        dataset = DatasetEntity(
            project_id=project_id,
            name=payload.name,
            description=payload.description,
            tags=payload.tags or [],
        )
        saved = await self.repo.save_dataset(dataset)

        # Create initial default v1.0.0 draft version
        initial_version = DatasetVersionEntity(
            dataset_id=saved.id,
            version="v1.0.0",
            version_number=1,
            version_label="v1.0.0",
            status="draft",
        )
        saved_ver = await self.repo.save_version(initial_version)
        saved.versions = [saved_ver]

        if self.outbox_repo:
            await self.outbox_repo.save_event(
                DatasetCreatedEvent(
                    dataset_id=saved.id,
                    project_id=saved.project_id,
                    name=saved.name,
                    created_by=saved.created_by,
                )
            )

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

        if dataset.status != "active":
            raise BadRequestException(
                f"Cannot create version for dataset '{dataset_id}' with status '{dataset.status}'."
            )

        new_version = DatasetVersionEntity(
            dataset_id=dataset_id,
            version=payload.version,
            status="draft",
        )
        saved = await self.repo.save_version(new_version)
        return DatasetVersionResponseDTO.model_validate(saved)


class ArchiveDatasetUseCase:
    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(self, dataset_id: str) -> DatasetResponseDTO:
        dataset = await self.repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundException(f"Dataset '{dataset_id}' not found.")

        if dataset.status != "archived":
            dataset.status = "archived"
            dataset = await self.repo.save_dataset(dataset)

        return DatasetResponseDTO.model_validate(dataset)


class UpdateDatasetUseCase:
    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(
        self, dataset_id: str, payload: DatasetUpdateDTO
    ) -> DatasetResponseDTO:
        dataset = await self.repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise NotFoundException(f"Dataset '{dataset_id}' not found.")

        if dataset.status == "archived":
            raise BadRequestException(f"Cannot update archived dataset '{dataset_id}'.")

        if payload.name is not None and payload.name.strip():
            dataset.name = payload.name.strip()
        if payload.description is not None:
            dataset.description = payload.description.strip() if payload.description else None
        if payload.tags is not None:
            dataset.tags = payload.tags

        saved = await self.repo.save_dataset(dataset)
        return DatasetResponseDTO.model_validate(saved)


class GetDatasetVersionDetailUseCase:
    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(self, version_id: str) -> DatasetVersionResponseDTO:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset version '{version_id}' not found.")
        return DatasetVersionResponseDTO.model_validate(version)


class PublishDatasetVersionUseCase:
    def __init__(
        self, repo: IDatasetRepository, outbox_repo: IOutboxRepository | None = None
    ) -> None:
        self.repo = repo
        self.outbox_repo = outbox_repo

    async def execute(self, version_id: str) -> DatasetVersionResponseDTO:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset version '{version_id}' not found.")

        dataset = await self.repo.get_dataset_by_id(version.dataset_id)
        if not dataset:
            raise NotFoundException(f"Parent dataset '{version.dataset_id}' not found.")

        # Enforce domain policy preconditions
        DatasetVersionPolicy.ensure_can_publish(dataset, version)

        # Retrieve all member assets to calculate canonical manifest hash
        assets = await self.repo.get_all_assets_by_version(version_id)

        manifest_hash = DatasetVersionPolicy.compute_manifest_hash(
            version, assets, version.version_config
        )

        version.status = "published"
        version.published_at = now_utc()
        version.manifest_hash = manifest_hash
        version.asset_count = len(assets)

        saved_ver = await self.repo.save_version(version)

        # Update dataset latest published version number
        current_num = dataset.latest_published_version_number or 0
        dataset.latest_published_version_number = max(
            current_num + 1, version.version_number or 1
        )
        await self.repo.save_dataset(dataset)

        if self.outbox_repo:
            await self.outbox_repo.save_event(
                DatasetVersionPublishedEvent(
                    dataset_id=dataset.id,
                    version_id=saved_ver.id,
                    version_number=saved_ver.version_number,
                    manifest_hash=saved_ver.manifest_hash,
                    asset_count=saved_ver.asset_count,
                )
            )

        saved_ver.assets = list(assets)
        return DatasetVersionResponseDTO.model_validate(saved_ver)


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


class InheritDatasetVersionUseCase:
    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(
        self, target_version_id: str, payload: InheritDatasetVersionRequestDTO
    ) -> InheritDatasetVersionResponseDTO:
        source_version_id = payload.source_version_id

        if target_version_id == source_version_id:
            raise BadRequestException("A dataset version cannot inherit from itself.")

        target_version = await self.repo.get_version_by_id(target_version_id)
        if not target_version:
            raise NotFoundException(
                f"Target dataset version '{target_version_id}' not found."
            )

        if target_version.status != "draft":
            raise BadRequestException(
                f"Cannot inherit assets into version '{target_version_id}' with status '{target_version.status}'. Only draft versions allow asset inheritance."
            )

        source_version = await self.repo.get_version_by_id(source_version_id)
        if not source_version:
            raise NotFoundException(
                f"Source dataset version '{source_version_id}' not found."
            )

        if source_version.dataset_id != target_version.dataset_id:
            raise BadRequestException(
                "Source dataset version must belong to the same dataset as the target version."
            )

        source_assets = await self.repo.get_all_assets_by_version(source_version_id)
        target_assets = await self.repo.get_all_assets_by_version(target_version_id)
        target_asset_ids = {a.id for a in target_assets}

        added_count = 0
        reused_count = 0

        for ast in source_assets:
            if ast.id in target_asset_ids:
                reused_count += 1
            else:
                await self.repo.add_asset_to_version(target_version_id, ast.id)
                target_asset_ids.add(ast.id)
                added_count += 1

        updated_target = await self.repo.get_version_by_id(target_version_id)
        total_assets = (
            updated_target.asset_count if updated_target else len(target_asset_ids)
        )

        return InheritDatasetVersionResponseDTO(
            target_version_id=target_version_id,
            source_version_id=source_version_id,
            added_assets_count=added_count,
            reused_assets_count=reused_count,
            total_assets_count=total_assets,
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


class ListVersionAssetsCursorUseCase:
    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(
        self, version_id: str, limit: int = 100, cursor_id: str | None = None
    ) -> CursorPageAssetResponseDTO:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset Version '{version_id}' not found.")

        assets, next_cursor = await self.repo.list_assets_by_version_cursor(
            version_id, limit=limit, cursor_id=cursor_id
        )
        return CursorPageAssetResponseDTO(
            items=[AssetResponseDTO.model_validate(a) for a in assets],
            next_cursor=next_cursor,
        )


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


class PrepareAssetUploadUseCase:
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


class FinalizeAssetImportUseCase:
    def __init__(
        self,
        repo: IDatasetRepository,
        storage_provider: IStorageProvider,
        outbox_repo: IOutboxRepository | None = None,
    ) -> None:
        self.repo = repo
        self.storage_provider = storage_provider
        self.outbox_repo = outbox_repo

    async def execute(
        self,
        version_id: str,
        payload: FinalizeAssetImportRequestDTO,
        created_by: str | None = None,
    ) -> FinalizeAssetImportResponseDTO:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset Version '{version_id}' not found.")

        if version.status != "draft":
            raise BadRequestException(
                f"Cannot finalize assets for version '{version_id}' with status '{version.status}'. Only draft versions allow asset imports."
            )

        dataset = await self.repo.get_dataset_by_id(version.dataset_id)
        if not dataset:
            raise NotFoundException(f"Parent dataset '{version.dataset_id}' not found.")

        project_id = dataset.project_id
        bucket = s3_settings.default_bucket
        imported_assets: list[AssetEntity] = []
        reused_count = 0
        new_count = 0

        for item in payload.items:
            clean_key = item.storage_key.lstrip("/")
            uri = f"/{bucket}/{clean_key}"

            # SHA256 Deduplication Check (Project-scoped)
            existing_asset = None
            if item.sha256 and item.sha256.strip():
                existing_asset = await self.repo.find_asset_by_sha256(
                    project_id, item.sha256.strip()
                )

            if existing_asset:
                saved_asset = existing_asset
                reused_count += 1
            else:
                new_asset = AssetEntity(
                    id=item.asset_id,
                    project_id=project_id,
                    filename=item.filename,
                    uri=uri,
                    mime_type=item.mime_type,
                    file_size=item.file_size,
                    sha256=item.sha256,
                    metadata=item.metadata,
                    data_format=item.data_format,
                    status="READY",
                    provenance=item.provenance,
                    created_by=created_by,
                )
                saved_asset = await self.repo.save_asset(new_asset)
                new_count += 1

            await self.repo.add_asset_to_version(version_id, saved_asset.id)
            imported_assets.append(saved_asset)

            if self.outbox_repo:
                await self.outbox_repo.save_event(
                    AssetReadyEvent(
                        asset_id=saved_asset.id,
                        project_id=project_id,
                        filename=saved_asset.filename,
                        mime_type=saved_asset.mime_type,
                        file_size=saved_asset.file_size,
                        sha256=saved_asset.sha256,
                    )
                )

        return FinalizeAssetImportResponseDTO(
            imported_assets=[
                AssetResponseDTO.model_validate(a) for a in imported_assets
            ],
            reused_assets_count=reused_count,
            new_assets_count=new_count,
        )



class RetireAssetUseCase:
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
