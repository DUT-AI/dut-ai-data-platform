from core.exceptions import NotFoundException
from modules.project.domain.interfaces import IProjectRepository
from modules.project.dtos.project_dtos import ProjectConfigDTO


class GetProjectConfigUseCase:
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str) -> ProjectConfigDTO:
        cfg = await self.repo.get_configuration(project_id)
        if cfg is None:
            raise NotFoundException(
                f"Project configuration for '{project_id}' not found."
            )
        return ProjectConfigDTO(project_id=project_id, **cfg)
