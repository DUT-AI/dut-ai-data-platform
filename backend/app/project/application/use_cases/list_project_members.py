from collections.abc import Sequence

from domain.entities import ProjectMemberEntity
from domain.exceptions import NotFoundException
from domain.interfaces import IProjectRepository


class ListProjectMembersUseCase:
    def __init__(self, repo: IProjectRepository):
        self.repo = repo

    async def execute(self, project_id: str) -> Sequence[ProjectMemberEntity]:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project '{project_id}' not found.")

        return await self.repo.list_members(project_id)
