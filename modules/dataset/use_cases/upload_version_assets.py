from core.exceptions import NotFoundException
from core.uow import IUnitOfWork
from core.utils.id_generator import generate_ulid
from modules.dataset.domain.entities import AssetEntity
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.domain.policies import DatasetVersionPolicy
from modules.dataset.dtos.dataset_dtos import (
    AssetResponseDTO,
    BatchUploadResultDTO,
)
from modules.dataset.services.asset_ingestion import (
    AssetFilePreparer,
    AssetObjectStore,
    PreparedAssetFile,
    StoredObject,
)


class UploadVersionAssetsUseCase:
    """Uploads files into storage and binds the resulting assets to a draft version.

    Either every new asset is committed together with its stored object, or the
    transaction is rolled back and every object uploaded by this call is
    deleted, so a database failure (including at commit) leaves no orphan.
    """

    def __init__(
        self,
        repo: IDatasetRepository,
        uow: IUnitOfWork,
        preparer: AssetFilePreparer,
        object_store: AssetObjectStore,
    ) -> None:
        self.repo = repo
        self.uow = uow
        self.preparer = preparer
        self.object_store = object_store

    async def execute(
        self,
        version_id: str,
        files: list[tuple[str, bytes, str | None]],
        created_by: int | None = None,
    ) -> BatchUploadResultDTO:
        project_id = await self._project_of_draft_version(version_id)

        # Validate every file before uploading any, so one bad file in the batch
        # never leaves the earlier ones behind in storage.
        prepared = [
            self.preparer.prepare(filename, content, mime_type)
            for filename, content, mime_type in files
            if filename and content
        ]

        stored: list[StoredObject] = []
        assets: list[AssetEntity] = []
        by_hash: dict[str, AssetEntity] = {}
        new_count = 0
        try:
            for item in prepared:
                asset = by_hash.get(item.sha256) or await self.repo.find_asset_by_sha256(
                    project_id, item.sha256
                )
                if asset is None:
                    asset = await self._store_new_asset(
                        project_id, item, created_by, stored
                    )
                    new_count += 1
                by_hash[item.sha256] = asset

                await self.repo.add_asset_to_version(version_id, asset.id)
                assets.append(asset)

            await self.uow.commit()
        except BaseException:
            await self.uow.rollback()
            await self.object_store.delete_many(stored)
            raise

        return BatchUploadResultDTO(
            uploaded_assets=[AssetResponseDTO.model_validate(a) for a in assets],
            reused_assets_count=len(assets) - new_count,
            new_assets_count=new_count,
        )

    async def _project_of_draft_version(self, version_id: str) -> str:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset Version '{version_id}' not found.")
        DatasetVersionPolicy.ensure_accepts_asset_uploads(version)

        dataset = await self.repo.get_dataset_by_id(version.dataset_id)
        if not dataset:
            raise NotFoundException(f"Parent dataset '{version.dataset_id}' not found.")
        return dataset.project_id

    async def _store_new_asset(
        self,
        project_id: str,
        item: PreparedAssetFile,
        created_by: int | None,
        stored: list[StoredObject],
    ) -> AssetEntity:
        asset_id = generate_ulid()
        obj = await self.object_store.put(project_id, asset_id, item)
        stored.append(obj)
        return await self.repo.save_asset(
            AssetEntity(
                id=asset_id,
                project_id=project_id,
                filename=item.filename,
                uri=obj.uri,
                mime_type=item.mime_type,
                file_size=item.size,
                sha256=item.sha256,
                metadata=item.metadata,
                created_by=created_by,
            )
        )
