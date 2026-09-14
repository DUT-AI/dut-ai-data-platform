from core.exceptions import NotFoundException
from modules.project.domain.interfaces import IProjectRepository
from modules.project.dtos.project_dtos import ProjectResponseDTO


class GetProjectUseCase:
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(
        self, project_id: str, user_id: str | None = None
    ) -> ProjectResponseDTO:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project '{project_id}' not found.")
        return ProjectResponseDTO.model_validate(project)
