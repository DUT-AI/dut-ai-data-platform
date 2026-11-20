import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.main import app
from core.uow import IUnitOfWork
from modules.dataset.domain.interfaces import IDatasetRepository


@pytest.mark.asyncio
async def test_unit_of_work_shares_the_request_session_with_repositories():
    container = app.state.dishka_container
    async with container() as request_container:
        uow = await request_container.get(IUnitOfWork)
        repo = await request_container.get(IDatasetRepository)
        session = await request_container.get(AsyncSession)

        # Committing through the UoW must commit what the repository flushed.
        assert uow._session is session
        assert repo.session is session


@pytest.mark.asyncio
async def test_each_request_gets_its_own_unit_of_work():
    container = app.state.dishka_container
    async with container() as first, container() as second:
        assert await first.get(IUnitOfWork) is not await second.get(IUnitOfWork)
