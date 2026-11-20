from sqlalchemy.ext.asyncio import AsyncSession

from core.uow import IUnitOfWork


class SqlAlchemyUnitOfWork(IUnitOfWork):
    """``IUnitOfWork`` over the request-scoped ``AsyncSession``."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()
