from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from core.storage.interface import IStorageProvider
from modules.export.application.use_cases.create_export_package import (
    CreateExportPackageUseCase,
)
from modules.export.application.use_cases.delete_export_package import (
    DeleteExportPackageUseCase,
)
from modules.export.application.use_cases.get_export_download_url import (
    GetExportDownloadUrlUseCase,
)
from modules.export.application.use_cases.get_export_package import (
    GetExportPackageUseCase,
)
from modules.export.application.use_cases.list_export_packages import (
    ListExportPackagesUseCase,
)
from modules.export.domain.interfaces import (
    IExportItemRepository,
    IExportPackageRepository,
    ISnapshotGateway,
    IStorageGateway,
)
from modules.export.domain.services.archiver_service import ArchiverService
from modules.export.infrastructure.background.export_worker import ExportWorker
from modules.export.infrastructure.gateways.s3_storage_gateway import S3StorageGateway
from modules.export.infrastructure.gateways.snapshot_gateway import SnapshotGateway
from modules.export.infrastructure.repositories.export_item_repository import (
    SqlExportItemRepository,
)
from modules.export.infrastructure.repositories.export_package_repository import (
    SqlExportPackageRepository,
)


class ExportProvider(Provider):
    """Dishka Dependency Injection Provider for Export Domain."""

    scope = Scope.REQUEST

    # Repositories
    @provide
    def get_export_package_repo(
        self, session: AsyncSession
    ) -> IExportPackageRepository:
        return SqlExportPackageRepository(session)

    @provide
    def get_export_item_repo(self, session: AsyncSession) -> IExportItemRepository:
        return SqlExportItemRepository(session)

    # Gateways & Services
    @provide
    def get_snapshot_gateway(
        self, session: AsyncSession, storage_provider: IStorageProvider
    ) -> ISnapshotGateway:
        return SnapshotGateway(session=session, storage_provider=storage_provider)

    @provide
    def get_storage_gateway(
        self, storage_provider: IStorageProvider
    ) -> IStorageGateway:
        return S3StorageGateway(storage_provider=storage_provider)

    @provide
    def get_archiver_service(self) -> ArchiverService:
        return ArchiverService()

    @provide
    def get_export_worker(
        self,
        package_repo: IExportPackageRepository,
        item_repo: IExportItemRepository,
        snapshot_gateway: ISnapshotGateway,
        storage_gateway: IStorageGateway,
        archiver_service: ArchiverService,
    ) -> ExportWorker:
        return ExportWorker(
            package_repo=package_repo,
            item_repo=item_repo,
            snapshot_gateway=snapshot_gateway,
            storage_gateway=storage_gateway,
            archiver_service=archiver_service,
        )

    # Use Cases
    @provide
    def get_create_export_package_use_case(
        self,
        package_repo: IExportPackageRepository,
        snapshot_gateway: ISnapshotGateway,
        worker: ExportWorker,
    ) -> CreateExportPackageUseCase:
        return CreateExportPackageUseCase(
            package_repo=package_repo,
            snapshot_gateway=snapshot_gateway,
            worker=worker,
        )

    @provide
    def get_get_export_package_use_case(
        self, package_repo: IExportPackageRepository
    ) -> GetExportPackageUseCase:
        return GetExportPackageUseCase(package_repo=package_repo)

    @provide
    def get_list_export_packages_use_case(
        self, package_repo: IExportPackageRepository
    ) -> ListExportPackagesUseCase:
        return ListExportPackagesUseCase(package_repo=package_repo)

    @provide
    def get_get_export_download_url_use_case(
        self,
        package_repo: IExportPackageRepository,
        storage_gateway: IStorageGateway,
    ) -> GetExportDownloadUrlUseCase:
        return GetExportDownloadUrlUseCase(
            package_repo=package_repo, storage_gateway=storage_gateway
        )

    @provide
    def get_delete_export_package_use_case(
        self,
        package_repo: IExportPackageRepository,
        storage_gateway: IStorageGateway,
    ) -> DeleteExportPackageUseCase:
        return DeleteExportPackageUseCase(
            package_repo=package_repo, storage_gateway=storage_gateway
        )
