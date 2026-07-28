from collections.abc import Sequence

from domain.entities import ProjectEntity
from domain.interfaces import IProjectRepository


class ListUserProjectsUseCase:
    def __init__(self, repository: IProjectRepository):
        self.repo = repository

    async def execute(
        self, user_id: str, page: int = 1, page_size: int = 20
    ) -> Sequence[ProjectEntity]:
        offset = (page - 1) * page_size
        return await self.repo.list_by_user(user_id, offset=offset, limit=page_size)
