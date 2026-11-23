from collections.abc import AsyncIterable, AsyncIterator
from datetime import UTC, datetime
from typing import BinaryIO

import pytest
import pytest_asyncio
from dishka import Provider, Scope, make_async_container, provide
from dishka.integrations.fastapi import setup_dishka
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool

# Import all models to register onto Base.metadata
import modules.annotation.models
import modules.dataset.models
import modules.ontology.models
import modules.project.models  # noqa: F401
from apps.api.main import app
from core.database.base import Base
from core.database.unit_of_work import SqlAlchemyUnitOfWork
from core.events.outbox import IOutboxRepository, SqlOutboxRepository
from core.queue.interface import IJobQueue, IKeyValueStore
from core.storage.interface import IStorageProvider, StoredObjectInfo
from core.uow import IUnitOfWork
from modules.annotation.di import AnnotationProvider
from modules.dataset.di import DatasetProvider
from modules.identity.di import IdentityProvider
from modules.ontology.di import OntologyProvider
from modules.project.di import ProjectProvider


@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


# In-memory SQLite engine for tests with StaticPool
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class TestDatabaseProvider(Provider):
    """Dishka provider for in-memory test database."""

    @provide(scope=Scope.APP)
    def get_engine(self) -> AsyncEngine:
        return test_engine

    @provide(scope=Scope.APP)
    def get_session_factory(self) -> async_sessionmaker[AsyncSession]:
        return TestSessionLocal

    @provide(scope=Scope.REQUEST)
    async def get_session(self) -> AsyncIterable[AsyncSession]:
        async with TestSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    @provide(scope=Scope.REQUEST)
    def get_unit_of_work(self, session: AsyncSession) -> IUnitOfWork:
        return SqlAlchemyUnitOfWork(session)

    @provide(scope=Scope.REQUEST)
    def get_outbox_repository(self, session: AsyncSession) -> IOutboxRepository | None:
        return SqlOutboxRepository(session)

    @provide(scope=Scope.APP)
    def get_storage_provider(self) -> IStorageProvider:
        return InMemoryStorageProvider()

    @provide(scope=Scope.APP)
    def get_job_queue(self) -> IJobQueue:
        return InMemoryJobQueue()

    @provide(scope=Scope.APP)
    def get_key_value_store(self) -> IKeyValueStore:
        return InMemoryKeyValueStore()


class InMemoryJobQueue(IJobQueue):
    """Records enqueued jobs; tests run them with the ``run_import_jobs`` fixture."""

    def __init__(self) -> None:
        self.enqueued: list[tuple[str, tuple, str]] = []

    async def enqueue(self, function: str, *args, job_id: str) -> None:
        if all(existing[2] != job_id for existing in self.enqueued):
            self.enqueued.append((function, args, job_id))


class InMemoryKeyValueStore(IKeyValueStore):
    def __init__(self) -> None:
        self.data: dict[str, str] = {}
        self.ttls: dict[str, int] = {}

    async def get(self, key: str) -> str | None:
        return self.data.get(key)

    async def set(self, key: str, value: str, *, ttl_seconds: int) -> None:
        self.data[key] = value
        self.ttls[key] = ttl_seconds

    async def delete(self, key: str) -> None:
        self.data.pop(key, None)


class InMemoryStorageProvider(IStorageProvider):
    def __init__(self) -> None:
        self.objects: dict[tuple[str, str], bytes] = {}
        self.modified: dict[tuple[str, str], datetime] = {}

    async def upload(
        self,
        bucket: str,
        key: str,
        data: BinaryIO,
        content_type: str | None = None,
    ) -> str:
        self.objects[(bucket, key)] = data.read()
        self.modified[(bucket, key)] = datetime.now(UTC)
        return f"/{bucket}/{key.lstrip('/')}"

    async def get_presigned_url(
        self, bucket: str, key: str, *, expires: int = 3600
    ) -> str:
        return f"https://storage.test/{bucket}/{key.lstrip('/')}?expires={expires}"

    async def get_presigned_upload_url(
        self,
        bucket: str,
        key: str,
        *,
        content_type: str | None = None,
        expires: int = 3600,
    ) -> str:
        return f"https://storage.test/upload/{bucket}/{key.lstrip('/')}?expires={expires}"

    async def delete(self, bucket: str, key: str) -> None:
        self.objects.pop((bucket, key), None)
        self.modified.pop((bucket, key), None)

    async def stat(self, bucket: str, key: str) -> StoredObjectInfo | None:
        data = self.objects.get((bucket, key))
        if data is None:
            return None
        return StoredObjectInfo(
            key=key, size=len(data), last_modified=self.modified[(bucket, key)]
        )

    async def download(self, bucket: str, key: str, dest: BinaryIO) -> None:
        dest.write(self.objects[(bucket, key)])

    async def list_objects(
        self, bucket: str, *, prefix: str = ""
    ) -> AsyncIterator[StoredObjectInfo]:
        for (obj_bucket, key), data in list(self.objects.items()):
            if obj_bucket == bucket and key.startswith(prefix):
                yield StoredObjectInfo(
                    key=key,
                    size=len(data),
                    last_modified=self.modified[(obj_bucket, key)],
                )

    def build_public_url(self, uri_or_path: str, bucket: str | None = None) -> str:
        return f"https://storage.test/{uri_or_path.lstrip('/')}"


@pytest.fixture
def test_session_factory():
    return TestSessionLocal


async def seed_test_catalog() -> None:
    from core.utils.id_generator import generate_ulid
    from modules.ontology.domain.catalog import (
        INPUT_DEFINITIONS,
        OUTPUT_DEFINITIONS,
    )
    from modules.ontology.models import InputDefinitionModel, OutputDefinitionModel
    async with TestSessionLocal() as session, session.begin():
        # Test-only catalog. Production definitions must be created explicitly
        # through the authorized Ontology catalog API; shared databases are never
        # populated implicitly by application startup or test helpers.
        session.add_all(
            [
                InputDefinitionModel(
                    id=generate_ulid(),
                    code=code,
                    name=name,
                    description=description,
                    allowed_formats=formats,
                )
                for code, name, description, formats in INPUT_DEFINITIONS
            ]
            + [
                OutputDefinitionModel(
                    id=generate_ulid(),
                    code=code,
                    name=name,
                    description=description,
                    supports_categories=supports_categories,
                    default_schema=default_schema,
                )
                for code, name, description, supports_categories, default_schema in OUTPUT_DEFINITIONS
            ]
        )


@pytest_asyncio.fixture(scope="session", autouse=True)
async def initialize_test_database():
    """Tạo schema trên SQLite in-memory, seed catalog và gắn test container vào FastAPI app."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await seed_test_catalog()

    container = make_async_container(
        TestDatabaseProvider(),
        IdentityProvider(),
        ProjectProvider(),
        DatasetProvider(),
        OntologyProvider(),
        AnnotationProvider(),
    )
    setup_dishka(container, app)

    yield

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest.fixture
def run_import_jobs():
    """Drain the in-memory queue the way a validation worker would.

    Each job runs in its own session; RetryImportLater is retried immediately
    with the next attempt number. Returns the final ImportJob of each run.
    """
    from core.config import asset_import_settings, s3_settings
    from modules.dataset.domain.interfaces import IAssetImportJobStore
    from modules.dataset.repository.dataset_repository import SqlDatasetRepository
    from modules.dataset.services.asset_ingestion import (
        AssetFilePreparer,
        AssetObjectStore,
    )
    from modules.dataset.services.asset_validation import AssetObjectValidator
    from modules.dataset.use_cases.process_asset_import import (
        ProcessAssetImportUseCase,
        RetryImportLater,
    )

    async def _run() -> list:
        container = app.state.dishka_container
        queue = await container.get(IJobQueue)
        job_store = await container.get(IAssetImportJobStore)
        storage = await container.get(IStorageProvider)
        bucket = s3_settings.default_bucket
        results = []
        while queue.enqueued:
            _function, _args, job_id = queue.enqueued.pop(0)
            attempt = 1
            while True:
                async with TestSessionLocal() as session:
                    use_case = ProcessAssetImportUseCase(
                        job_store=job_store,
                        repo=SqlDatasetRepository(session),
                        uow=SqlAlchemyUnitOfWork(session),
                        validator=AssetObjectValidator(
                            storage,
                            bucket=bucket,
                            preparer=AssetFilePreparer(),
                            max_file_bytes=asset_import_settings.asset_import_max_file_bytes,
                        ),
                        object_store=AssetObjectStore(storage, bucket=bucket),
                        outbox_repo=SqlOutboxRepository(session),
                        max_tries=asset_import_settings.asset_import_max_tries,
                        retry_delay=lambda _attempt: 0,
                    )
                    try:
                        results.append(await use_case.execute(job_id, attempt))
                        break
                    except RetryImportLater:
                        attempt += 1
        return results

    return _run


@pytest.fixture
def import_files(run_import_jobs):
    """POST files to the legacy upload route, run the job, return its final status."""

    async def _import(client, version_id: str, files: list) -> dict:
        accepted = await client.post(
            f"/api/v1/dataset-versions/{version_id}/assets", files=files
        )
        assert accepted.status_code == 202, accepted.text
        await run_import_jobs()
        status = await client.get(f"/api/v1/asset-import-jobs/{accepted.json()['job_id']}")
        assert status.status_code == 200, status.text
        return status.json()

    return _import
