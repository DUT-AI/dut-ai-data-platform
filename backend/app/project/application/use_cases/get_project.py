from domain.entities import ProjectEntity
from domain.exceptions import NotFoundException, UnauthorizedException
from domain.interfaces import IProjectRepository


class GetProjectUseCase:
    def __init__(self, repository: IProjectRepository):
        self.repo = repository

    async def execute(self, project_id: str, user_id: str) -> ProjectEntity:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project with id '{project_id}' was not found.")

        member = await self.repo.get_member(project_id, user_id)
        if not member or member.status != "active":
            raise UnauthorizedException("User is not an active member of this project.")

        return project
