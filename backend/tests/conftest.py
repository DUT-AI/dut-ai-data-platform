import asyncio
from collections.abc import AsyncIterable, Generator

import pytest
import pytest_asyncio
from app.auth.use_cases import UseCaseProvider
from app.domain.interfaces.s3_client import IS3Client
from app.infrastructure.persistence.models.base import Base
from app.project.infrastructure.di import RepositoryProvider
from dishka import Provider, Scope, make_async_container, provide
from dishka.integrations.fastapi import setup_dishka
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# SQLite In-memory Database for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


class TestDatabaseProvider(Provider):
    def __init__(self, session_maker) -> None:
        super().__init__()
        self.session_maker = session_maker

    @provide(scope=Scope.REQUEST)
    async def get_session(self) -> AsyncIterable[AsyncSession]:
        async with self.session_maker() as session:
            yield session
            await session.commit()


class TestClientProvider(Provider):
    scope = Scope.APP

    @provide
    def get_s3_client(self) -> IS3Client:
        class MockS3Client:
            def upload_fileobj(self, file_obj, bucket, key):
                pass

            def get_object_url(self, bucket, key):
                return f"http://mock-s3/{bucket}/{key}"

            def generate_presigned_upload_url(
                self, bucket, key, content_type, expires_in=3600
            ):
                return f"http://mock-s3/{bucket}/{key}?presigned=true"

        return MockS3Client()


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_session_maker(test_engine):
    session_maker = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    yield session_maker
    # Reset DB between tests
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@pytest_asyncio.fixture(scope="function")
async def test_app(test_session_maker) -> AsyncIterable[FastAPI]:
    from app.presentation.api.exceptions import setup_exception_handlers
    from app.presentation.api.routers import auth_router, me_router, uploads_router
    from fastapi import FastAPI

    app = FastAPI(title="Test App")
    setup_exception_handlers(app)

    container = make_async_container(
        TestDatabaseProvider(test_session_maker),
        RepositoryProvider(),
        TestClientProvider(),
        UseCaseProvider(),
    )
    setup_dishka(container, app)

    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(me_router, prefix="/api/v1")
    app.include_router(uploads_router, prefix="/api/v1")

    yield app
    await container.close()


@pytest_asyncio.fixture(scope="function")
async def client(test_app) -> AsyncIterable[AsyncClient]:
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
