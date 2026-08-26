from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.repository.dataset_repository import SqlDatasetRepository
from modules.dataset.use_cases import (
    CreateDatasetUseCase,
    CreateDatasetVersionUseCase,
    GetAssetDetailUseCase,
    GetAssetDownloadUrlUseCase,
    GetDatasetDetailUseCase,
    GetDatasetVersionDetailUseCase,
    ListProjectDatasetsUseCase,
    ListVersionAssetsUseCase,
    PublishDatasetVersionUseCase,
    RemoveVersionAssetUseCase,
    UploadVersionAssetsUseCase,
)


class DatasetProvider(Provider):
    """Dishka DI Provider for Dataset feature module."""

    scope = Scope.REQUEST

    @provide
    def get_repository(self, session: AsyncSession) -> IDatasetRepository:
        return SqlDatasetRepository(session)

    create_dataset_uc = provide(CreateDatasetUseCase)
    list_project_datasets_uc = provide(ListProjectDatasetsUseCase)
    get_dataset_detail_uc = provide(GetDatasetDetailUseCase)
    create_dataset_version_uc = provide(CreateDatasetVersionUseCase)
    get_dataset_version_detail_uc = provide(GetDatasetVersionDetailUseCase)
    publish_dataset_version_uc = provide(PublishDatasetVersionUseCase)
    upload_version_assets_uc = provide(UploadVersionAssetsUseCase)
    remove_version_asset_uc = provide(RemoveVersionAssetUseCase)
    list_version_assets_uc = provide(ListVersionAssetsUseCase)
    get_asset_detail_uc = provide(GetAssetDetailUseCase)
    get_asset_download_url_uc = provide(GetAssetDownloadUrlUseCase)
