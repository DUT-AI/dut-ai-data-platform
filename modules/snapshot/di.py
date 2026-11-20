from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from core.storage.interface import IStorageProvider
from modules.snapshot.application.use_cases.archive_snapshot import (
    ArchiveSnapshotUseCase,
)
from modules.snapshot.application.use_cases.cancel_snapshot import (
    CancelSnapshotUseCase,
)
from modules.snapshot.application.use_cases.create_snapshot import (
    CreateSnapshotUseCase,
)
from modules.snapshot.application.use_cases.diff_snapshots import (
    DiffSnapshotsUseCase,
)
from modules.snapshot.application.use_cases.get_snapshot_detail import (
    GetSnapshotDetailUseCase,
)
from modules.snapshot.application.use_cases.get_snapshot_manifest import (
    GetSnapshotManifestUseCase,
)
from modules.snapshot.application.use_cases.list_snapshot_items import (
    ListSnapshotItemsUseCase,
)
from modules.snapshot.application.use_cases.list_snapshots import (
    ListSnapshotsUseCase,
)
from modules.snapshot.application.use_cases.manage_release_tags import (
    ManageReleaseTagsUseCase,
)
from modules.snapshot.application.use_cases.purge_snapshot import (
    PurgeSnapshotUseCase,
)
from modules.snapshot.domain.interfaces import (
    AnnotationGateway,
    ChecksumService,
    DatasetGateway,
    OntologyGateway,
    ReleaseTagRepository,
    SnapshotDiffService,
    SnapshotItemRepository,
    SnapshotManifestRepository,
    SnapshotRepository,
    StorageGateway,
    StratificationService,
)
from modules.snapshot.domain.services.checksum_service import (
    DefaultChecksumService,
)
from modules.snapshot.domain.services.stratification_service import (
    DefaultStratificationService,
)
from modules.snapshot.infrastructure.background.snapshot_worker import (
    SnapshotWorker,
)
from modules.snapshot.infrastructure.gateways.annotation_gateway import (
    SqlAnnotationGateway,
)
from modules.snapshot.infrastructure.gateways.dataset_gateway import (
    SqlDatasetGateway,
)
from modules.snapshot.infrastructure.gateways.ontology_gateway import (
    SqlOntologyGateway,
)
from modules.snapshot.infrastructure.gateways.storage_gateway import (
    MinIOStorageGateway,
)
from modules.snapshot.infrastructure.repositories.release_tag_repository import (
    SqlReleaseTagRepository,
)
from modules.snapshot.infrastructure.repositories.snapshot_item_repository import (
    SqlSnapshotItemRepository,
)
from modules.snapshot.infrastructure.repositories.snapshot_manifest_repository import (
    SqlSnapshotManifestRepository,
)
from modules.snapshot.infrastructure.repositories.snapshot_repository import (
    SqlSnapshotRepository,
)
from modules.snapshot.infrastructure.services.snapshot_diff_service import (
    SqlSnapshotDiffService,
)


class SnapshotProvider(Provider):
    """Dishka Dependency Injection Provider for Snapshot Domain."""

    scope = Scope.REQUEST

    # Repositories
    @provide
    def get_snapshot_repo(self, session: AsyncSession) -> SnapshotRepository:
        return SqlSnapshotRepository(session)

    @provide
    def get_snapshot_item_repo(self, session: AsyncSession) -> SnapshotItemRepository:
        return SqlSnapshotItemRepository(session)

    @provide
    def get_snapshot_manifest_repo(
        self, session: AsyncSession
    ) -> SnapshotManifestRepository:
        return SqlSnapshotManifestRepository(session)

    @provide
    def get_tag_repo(self, session: AsyncSession) -> ReleaseTagRepository:
        return SqlReleaseTagRepository(session)

    # Gateways
    @provide
    def get_dataset_gateway(self, session: AsyncSession) -> DatasetGateway:
        return SqlDatasetGateway(session)

    @provide
    def get_annotation_gateway(self, session: AsyncSession) -> AnnotationGateway:
        return SqlAnnotationGateway(session)

    @provide
    def get_ontology_gateway(self, session: AsyncSession) -> OntologyGateway:
        return SqlOntologyGateway(session)

    @provide
    def get_storage_gateway(self, storage_provider: IStorageProvider) -> StorageGateway:
        return MinIOStorageGateway(storage_provider)

    # Services
    @provide
    def get_checksum_service(self) -> ChecksumService:
        return DefaultChecksumService()

    @provide
    def get_stratification_service(self) -> StratificationService:
        return DefaultStratificationService()

    @provide
    def get_diff_service(self, session: AsyncSession) -> SnapshotDiffService:
        return SqlSnapshotDiffService(session)

    # Background Worker
    @provide
    def get_snapshot_worker(
        self,
        snapshot_repo: SnapshotRepository,
        snapshot_item_repo: SnapshotItemRepository,
        manifest_repo: SnapshotManifestRepository,
        dataset_gateway: DatasetGateway,
        annotation_gateway: AnnotationGateway,
        ontology_gateway: OntologyGateway,
        storage_gateway: StorageGateway,
        checksum_service: ChecksumService,
        stratification_service: StratificationService,
    ) -> SnapshotWorker:
        return SnapshotWorker(
            snapshot_repo=snapshot_repo,
            snapshot_item_repo=snapshot_item_repo,
            manifest_repo=manifest_repo,
            dataset_gateway=dataset_gateway,
            annotation_gateway=annotation_gateway,
            ontology_gateway=ontology_gateway,
            storage_gateway=storage_gateway,
            checksum_service=checksum_service,
            stratification_service=stratification_service,
        )

    # Use Cases
    create_snapshot_uc = provide(CreateSnapshotUseCase)
    cancel_snapshot_uc = provide(CancelSnapshotUseCase)
    get_snapshot_detail_uc = provide(GetSnapshotDetailUseCase)
    list_snapshots_uc = provide(ListSnapshotsUseCase)
    get_snapshot_manifest_uc = provide(GetSnapshotManifestUseCase)
    list_snapshot_items_uc = provide(ListSnapshotItemsUseCase)
    diff_snapshots_uc = provide(DiffSnapshotsUseCase)
    manage_release_tags_uc = provide(ManageReleaseTagsUseCase)
    archive_snapshot_uc = provide(ArchiveSnapshotUseCase)
    purge_snapshot_uc = provide(PurgeSnapshotUseCase)
