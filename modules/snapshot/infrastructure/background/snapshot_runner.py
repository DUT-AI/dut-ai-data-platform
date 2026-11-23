import asyncio

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from core.database.unit_of_work import SqlAlchemyUnitOfWork
from core.storage.interface import IStorageProvider
from modules.snapshot.domain.entities import SnapshotEntity
from modules.snapshot.domain.interfaces import SnapshotJobLauncher
from modules.snapshot.domain.services.checksum_service import DefaultChecksumService
from modules.snapshot.domain.services.stratification_service import (
    DefaultStratificationService,
)
from modules.snapshot.infrastructure.background.snapshot_worker import SnapshotWorker
from modules.snapshot.infrastructure.gateways.annotation_gateway import (
    SqlAnnotationGateway,
)
from modules.snapshot.infrastructure.gateways.dataset_gateway import SqlDatasetGateway
from modules.snapshot.infrastructure.gateways.ontology_gateway import (
    SqlOntologyGateway,
)
from modules.snapshot.infrastructure.gateways.storage_gateway import (
    MinIOStorageGateway,
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


def build_snapshot_worker(
    session: AsyncSession,
    storage_provider: IStorageProvider,
    timeout_seconds: float = 3600,
) -> SnapshotWorker:
    """Wire a worker whose repositories and unit of work share ``session``."""
    return SnapshotWorker(
        snapshot_repo=SqlSnapshotRepository(session),
        snapshot_item_repo=SqlSnapshotItemRepository(session),
        manifest_repo=SqlSnapshotManifestRepository(session),
        dataset_gateway=SqlDatasetGateway(session),
        annotation_gateway=SqlAnnotationGateway(session),
        ontology_gateway=SqlOntologyGateway(session),
        storage_gateway=MinIOStorageGateway(storage_provider),
        checksum_service=DefaultChecksumService(),
        stratification_service=DefaultStratificationService(),
        uow=SqlAlchemyUnitOfWork(session),
        timeout_seconds=timeout_seconds,
    )


class SnapshotJobRunner(SnapshotJobLauncher):
    """Runs each snapshot build in its own session, outside any HTTP request.

    The request session closes as soon as the response is sent, so a background
    build must never reuse it. Running tasks are referenced until they finish,
    otherwise the event loop may garbage-collect them mid-way.
    """

    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        storage_provider: IStorageProvider,
        timeout_seconds: float = 3600,
    ) -> None:
        self._session_factory = session_factory
        self._storage_provider = storage_provider
        self._timeout_seconds = timeout_seconds
        self._tasks: set[asyncio.Task] = set()

    def launch(self, snapshot_id: str) -> None:
        task = asyncio.create_task(self.run(snapshot_id), name=f"snapshot:{snapshot_id}")
        self._tasks.add(task)
        task.add_done_callback(self._on_done)

    async def run(self, snapshot_id: str) -> SnapshotEntity:
        async with self._session_factory() as session:
            worker = build_snapshot_worker(
                session, self._storage_provider, self._timeout_seconds
            )
            return await worker.execute(snapshot_id)

    def _on_done(self, task: asyncio.Task) -> None:
        self._tasks.discard(task)
        if task.cancelled():
            logger.warning("{} was cancelled.", task.get_name())
        elif (exc := task.exception()) is not None:
            logger.error("{} crashed: {}", task.get_name(), exc)
