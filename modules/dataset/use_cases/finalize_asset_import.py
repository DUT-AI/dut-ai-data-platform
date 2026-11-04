from core.config import s3_settings
from core.events.domain_event import AssetReadyEvent
from core.events.outbox import IOutboxRepository
from core.exceptions import BadRequestException, NotFoundException
from core.storage.interface import IStorageProvider
from modules.dataset.domain.entities import AssetEntity
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.dtos.dataset_dtos import (
    AssetResponseDTO,
    FinalizeAssetImportRequestDTO,
    FinalizeAssetImportResponseDTO,
)


class FinalizeAssetImportUseCase:
    """Finalizes assets uploaded via presigned URLs and links them to the draft dataset version."""

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
        created_by: int | str | None = None,
    ) -> FinalizeAssetImportResponseDTO:
        parsed_created_by = (
            int(created_by)
            if isinstance(created_by, int)
            or (isinstance(created_by, str) and str(created_by).isdigit())
            else None
        )

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
                    created_by=parsed_created_by,
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

