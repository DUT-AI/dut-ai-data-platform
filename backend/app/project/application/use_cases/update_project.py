from domain.entities import ProjectEntity
from domain.exceptions import NotFoundException
from domain.interfaces import IProjectRepository

from app.project.application.dtos import ProjectUpdateDTO


class UpdateProjectUseCase:
    def __init__(self, repo: IProjectRepository):
        self.repo = repo

    async def execute(self, project_id: str, dto: ProjectUpdateDTO) -> ProjectEntity:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project '{project_id}' not found.")

        updated_entity = ProjectEntity(
            id=project.id,
            name=dto.name if dto.name is not None else project.name,
            description=dto.description
            if dto.description is not None
            else project.description,
            project_type=project.project_type,
            owner_id=project.owner_id,
            status=dto.status if dto.status is not None else project.status,
            created_at=project.created_at,
            updated_at=project.updated_at,
        )
        return await self.repo.save(updated_entity)
