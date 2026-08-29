from collections.abc import AsyncIterable

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
from core.storage.di import StorageProvider
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


@pytest_asyncio.fixture(scope="session", autouse=True)
async def initialize_test_database():
    """Tạo schema trên SQLite in-memory và gắn test container vào FastAPI app."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    container = make_async_container(
        TestDatabaseProvider(),
        StorageProvider(),
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
