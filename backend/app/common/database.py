from collections.abc import AsyncIterable

from database.session import create_engine, create_session_factory
from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

engine = create_engine(settings.database_url, echo=settings.db_echo)
AsyncSessionLocal = create_session_factory(engine)


class DatabaseProvider(Provider):
    """Provider for database session dependency."""

    @provide(scope=Scope.REQUEST)
    async def get_session(self) -> AsyncIterable[AsyncSession]:
        async with AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
