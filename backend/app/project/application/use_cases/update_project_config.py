from domain.exceptions import NotFoundException
from domain.interfaces import IProjectRepository

from app.project.application.dtos import ProjectConfigDTO


class UpdateProjectConfigUseCase:
    def __init__(self, repo: IProjectRepository):
        self.repo = repo

    async def execute(self, project_id: str, settings: dict) -> ProjectConfigDTO:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project '{project_id}' not found.")

        updated_settings = await self.repo.save_configuration(project_id, settings)
        return ProjectConfigDTO(project_id=project_id, settings=updated_settings)
