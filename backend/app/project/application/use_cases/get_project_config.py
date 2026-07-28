from domain.exceptions import NotFoundException
from domain.interfaces import IProjectRepository

from app.project.application.dtos import ProjectConfigDTO


class GetProjectConfigUseCase:
    def __init__(self, repo: IProjectRepository):
        self.repo = repo

    async def execute(self, project_id: str) -> ProjectConfigDTO:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project '{project_id}' not found.")

        settings = await self.repo.get_configuration(project_id)
        return ProjectConfigDTO(project_id=project_id, settings=settings or {})
