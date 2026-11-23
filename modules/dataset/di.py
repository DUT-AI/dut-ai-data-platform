from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import asset_import_settings, s3_settings
from core.queue.interface import IJobQueue, IKeyValueStore
from core.storage.interface import IStorageProvider
from modules.dataset.domain.interfaces import IAssetImportJobStore, IDatasetRepository
from modules.dataset.repository.dataset_repository import SqlDatasetRepository
from modules.dataset.repository.import_job_store import KeyValueImportJobStore
from modules.dataset.services.asset_ingestion import AssetFilePreparer, AssetObjectStore
from modules.dataset.use_cases import (
    ArchiveDatasetUseCase,
    CreateDatasetUseCase,
    CreateDatasetVersionUseCase,
    GetAssetDetailUseCase,
    GetAssetDownloadUrlUseCase,
    GetAssetImportJobUseCase,
    GetDatasetDetailUseCase,
    GetDatasetVersionDetailUseCase,
    InheritDatasetVersionUseCase,
    ListProjectDatasetsUseCase,
    ListVersionAssetsCursorUseCase,
    ListVersionAssetsUseCase,
    PrepareAssetUploadUseCase,
    PublishDatasetVersionUseCase,
    RemoveVersionAssetUseCase,
    RequestAssetImportUseCase,
    RetireAssetUseCase,
    StageDirectUploadUseCase,
    UpdateDatasetUseCase,
)


class DatasetProvider(Provider):
    """Dishka DI Provider for Dataset feature module."""

    scope = Scope.REQUEST

    @provide
    def get_repository(self, session: AsyncSession) -> IDatasetRepository:
        return SqlDatasetRepository(session)

    @provide(scope=Scope.APP)
    def get_asset_file_preparer(self) -> AssetFilePreparer:
        return AssetFilePreparer()

    @provide(scope=Scope.APP)
    def get_asset_object_store(self, storage: IStorageProvider) -> AssetObjectStore:
        return AssetObjectStore(storage, bucket=s3_settings.default_bucket)

    @provide(scope=Scope.APP)
    def get_import_job_store(self, store: IKeyValueStore) -> IAssetImportJobStore:
        return KeyValueImportJobStore(
            store,
            key_prefix=asset_import_settings.asset_import_key_prefix,
            ttl_seconds=asset_import_settings.asset_import_job_ttl_seconds,
        )

    @provide
    def get_request_asset_import(
        self,
        repo: IDatasetRepository,
        job_store: IAssetImportJobStore,
        queue: IJobQueue,
    ) -> RequestAssetImportUseCase:
        return RequestAssetImportUseCase(
            repo, job_store, queue, max_items=asset_import_settings.asset_import_max_items
        )

    create_dataset_uc = provide(CreateDatasetUseCase)
    update_dataset_uc = provide(UpdateDatasetUseCase)
    archive_dataset_uc = provide(ArchiveDatasetUseCase)
    list_project_datasets_uc = provide(ListProjectDatasetsUseCase)
    get_dataset_detail_uc = provide(GetDatasetDetailUseCase)
    create_dataset_version_uc = provide(CreateDatasetVersionUseCase)
    get_dataset_version_detail_uc = provide(GetDatasetVersionDetailUseCase)
    publish_dataset_version_uc = provide(PublishDatasetVersionUseCase)
    inherit_dataset_version_uc = provide(InheritDatasetVersionUseCase)
    stage_direct_upload_uc = provide(StageDirectUploadUseCase)
    prepare_asset_upload_uc = provide(PrepareAssetUploadUseCase)
    get_asset_import_job_uc = provide(GetAssetImportJobUseCase)
    remove_version_asset_uc = provide(RemoveVersionAssetUseCase)
    retire_asset_uc = provide(RetireAssetUseCase)
    list_version_assets_uc = provide(ListVersionAssetsUseCase)
    list_version_assets_cursor_uc = provide(ListVersionAssetsCursorUseCase)
    get_asset_detail_uc = provide(GetAssetDetailUseCase)
    get_asset_download_url_uc = provide(GetAssetDownloadUrlUseCase)
