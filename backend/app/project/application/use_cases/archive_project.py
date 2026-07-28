from domain.entities import ProjectEntity
from domain.exceptions import NotFoundException
from domain.interfaces import IProjectRepository


class ArchiveProjectUseCase:
    def __init__(self, repo: IProjectRepository):
        self.repo = repo

    async def execute(self, project_id: str) -> ProjectEntity:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project '{project_id}' not found.")

        archived_entity = ProjectEntity(
            id=project.id,
            name=project.name,
            description=project.description,
            project_type=project.project_type,
            owner_id=project.owner_id,
            status="archived",
            created_at=project.created_at,
            updated_at=project.updated_at,
        )
        return await self.repo.save(archived_entity)
