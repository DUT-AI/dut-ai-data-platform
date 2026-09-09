from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from core.events.outbox import IOutboxRepository, SqlOutboxRepository
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.repository.dataset_repository import SqlDatasetRepository
from modules.dataset.use_cases import (
    ArchiveDatasetUseCase,
    CreateDatasetUseCase,
    CreateDatasetVersionUseCase,
    FinalizeAssetImportUseCase,
    GetAssetDetailUseCase,
    GetAssetDownloadUrlUseCase,
    GetDatasetDetailUseCase,
    GetDatasetVersionDetailUseCase,
    InheritDatasetVersionUseCase,
    ListProjectDatasetsUseCase,
    ListVersionAssetsCursorUseCase,
    ListVersionAssetsUseCase,
    PrepareAssetUploadUseCase,
    PublishDatasetVersionUseCase,
    RemoveVersionAssetUseCase,
    RetireAssetUseCase,
    UpdateDatasetUseCase,
    UploadVersionAssetsUseCase,
)


class DatasetProvider(Provider):
    """Dishka DI Provider for Dataset feature module."""

    scope = Scope.REQUEST

    @provide
    def get_repository(self, session: AsyncSession) -> IDatasetRepository:
        return SqlDatasetRepository(session)

    @provide
    def get_outbox_repository(self, session: AsyncSession) -> IOutboxRepository | None:
        return SqlOutboxRepository(session)

    create_dataset_uc = provide(CreateDatasetUseCase)
    update_dataset_uc = provide(UpdateDatasetUseCase)
    archive_dataset_uc = provide(ArchiveDatasetUseCase)
    list_project_datasets_uc = provide(ListProjectDatasetsUseCase)
    get_dataset_detail_uc = provide(GetDatasetDetailUseCase)
    create_dataset_version_uc = provide(CreateDatasetVersionUseCase)
    get_dataset_version_detail_uc = provide(GetDatasetVersionDetailUseCase)
    publish_dataset_version_uc = provide(PublishDatasetVersionUseCase)
    inherit_dataset_version_uc = provide(InheritDatasetVersionUseCase)
    upload_version_assets_uc = provide(UploadVersionAssetsUseCase)
    prepare_asset_upload_uc = provide(PrepareAssetUploadUseCase)
    finalize_asset_import_uc = provide(FinalizeAssetImportUseCase)
    remove_version_asset_uc = provide(RemoveVersionAssetUseCase)
    retire_asset_uc = provide(RetireAssetUseCase)
    list_version_assets_uc = provide(ListVersionAssetsUseCase)
    list_version_assets_cursor_uc = provide(ListVersionAssetsCursorUseCase)
    get_asset_detail_uc = provide(GetAssetDetailUseCase)
    get_asset_download_url_uc = provide(GetAssetDownloadUrlUseCase)
