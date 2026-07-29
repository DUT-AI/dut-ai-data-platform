from app.dataset.application.use_cases import (
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
from app.dataset.infrastructure.repository import DatasetRepository
from dishka import Provider, Scope, provide
from domain.interfaces import IDatasetRepository, IStorageProvider
from sqlalchemy.ext.asyncio import AsyncSession


class DatasetProvider(Provider):
    scope = Scope.REQUEST

    @provide
    def get_repository(self, session: AsyncSession) -> IDatasetRepository:
        return DatasetRepository(session)

    @provide
    def create_dataset_uc(self, repo: IDatasetRepository) -> CreateDatasetUseCase:
        return CreateDatasetUseCase(repo)

    @provide
    def list_project_datasets_uc(
        self, repo: IDatasetRepository
    ) -> ListProjectDatasetsUseCase:
        return ListProjectDatasetsUseCase(repo)

    @provide
    def get_dataset_detail_uc(
        self, repo: IDatasetRepository
    ) -> GetDatasetDetailUseCase:
        return GetDatasetDetailUseCase(repo)

    @provide
    def create_dataset_version_uc(
        self, repo: IDatasetRepository
    ) -> CreateDatasetVersionUseCase:
        return CreateDatasetVersionUseCase(repo)

    @provide
    def get_dataset_version_detail_uc(
        self, repo: IDatasetRepository
    ) -> GetDatasetVersionDetailUseCase:
        return GetDatasetVersionDetailUseCase(repo)

    @provide
    def publish_dataset_version_uc(
        self, repo: IDatasetRepository
    ) -> PublishDatasetVersionUseCase:
        return PublishDatasetVersionUseCase(repo)

    @provide
    def upload_version_assets_uc(
        self, repo: IDatasetRepository, storage_provider: IStorageProvider
    ) -> UploadVersionAssetsUseCase:
        return UploadVersionAssetsUseCase(repo, storage_provider)

    @provide
    def remove_version_asset_uc(
        self, repo: IDatasetRepository
    ) -> RemoveVersionAssetUseCase:
        return RemoveVersionAssetUseCase(repo)

    @provide
    def list_version_assets_uc(
        self, repo: IDatasetRepository
    ) -> ListVersionAssetsUseCase:
        return ListVersionAssetsUseCase(repo)

    @provide
    def get_asset_detail_uc(self, repo: IDatasetRepository) -> GetAssetDetailUseCase:
        return GetAssetDetailUseCase(repo)

    @provide
    def get_asset_download_url_uc(
        self, repo: IDatasetRepository, storage_provider: IStorageProvider
    ) -> GetAssetDownloadUrlUseCase:
        return GetAssetDownloadUrlUseCase(repo, storage_provider)
