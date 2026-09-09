from collections.abc import AsyncIterable
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
from core.storage.interface import IStorageProvider
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

    @provide(scope=Scope.APP)
    def get_storage_provider(self) -> IStorageProvider:
        return InMemoryStorageProvider()


class InMemoryStorageProvider(IStorageProvider):
    def __init__(self) -> None:
        self.objects: dict[tuple[str, str], bytes] = {}

    async def upload(
        self,
        bucket: str,
        key: str,
        data: BinaryIO,
        content_type: str | None = None,
    ) -> str:
        self.objects[(bucket, key)] = data.read()
        return f"/{bucket}/{key.lstrip('/')}"

    async def get_presigned_url(
        self, bucket: str, key: str, expires: int = 3600
    ) -> str:
        return f"https://storage.test/{bucket}/{key.lstrip('/')}?expires={expires}"

    async def delete(self, bucket: str, key: str) -> None:
        self.objects.pop((bucket, key), None)

    def build_public_url(self, uri_or_path: str, bucket: str | None = None) -> str:
        return f"https://storage.test/{uri_or_path.lstrip('/')}"


@pytest.fixture
def test_session_factory():
    return TestSessionLocal


async def seed_test_catalog() -> None:
    from apps.cli.seed_project_catalog import TASKS
    from core.utils.datetime_utils import now_utc
    from core.utils.id_generator import generate_ulid
    from modules.ontology.domain.catalog import (
        INPUT_DEFINITIONS,
        OUTPUT_DEFINITIONS,
    )
    from modules.ontology.models import InputDefinitionModel, OutputDefinitionModel
    from modules.project.models.catalog import (
        ProjectTemplateModel,
        ProjectTemplateVersionModel,
        TaskDefinitionModel,
        TaskDefinitionVersionModel,
        TemplateProviderCompatibilityModel,
    )

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
        for key, name, category, modality, capabilities, providers in TASKS:
            task = TaskDefinitionModel(
                id=generate_ulid(),
                key=key,
                name=name,
                category=category,
                modality=modality,
                status="active",
            )
            session.add(task)
            await session.flush()

            version = TaskDefinitionVersionModel(
                id=generate_ulid(),
                task_definition_id=task.id,
                version="1.0",
                input_schema={"modality": modality},
                capability_schema={"primitives": capabilities},
                constraints_payload={},
                status="published",
                published_at=now_utc(),
            )
            session.add(version)
            await session.flush()

            template_key = f"{key}.blank"
            template = ProjectTemplateModel(
                id=generate_ulid(),
                key=template_key,
                name=f"Blank {name}",
                task_definition_id=task.id,
                status="active",
            )
            session.add(template)
            await session.flush()

            tv = ProjectTemplateVersionModel(
                id=generate_ulid(),
                project_template_id=template.id,
                version="1.0",
                default_project_configuration={},
                status="published",
                published_at=now_utc(),
            )
            session.add(tv)
            await session.flush()

            for provider in providers:
                session.add(
                    TemplateProviderCompatibilityModel(
                        id=generate_ulid(),
                        project_template_version_id=tv.id,
                        provider_key=provider,
                        status="active",
                        constraints_payload={},
                    )
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
