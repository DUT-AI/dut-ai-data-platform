from datetime import UTC, datetime

from domain.entities import ProjectEntity, ProjectMemberEntity
from domain.interfaces import IProjectRepository
from shared.utils.id_generator import generate_ulid

from app.project.application.dtos import ProjectCreateDTO


class CreateProjectUseCase:
    def __init__(self, repository: IProjectRepository):
        self.repo = repository

    async def execute(self, dto: ProjectCreateDTO, owner_id: str) -> ProjectEntity:
        project_entity = ProjectEntity(
            name=dto.name,
            description=dto.description,
            project_type=dto.project_type,
            owner_id=owner_id,
            status="active",
        )
        saved_project = await self.repo.save(project_entity)

        owner_member = ProjectMemberEntity(
            id=generate_ulid(),
            project_id=saved_project.id,
            user_id=owner_id,
            role="owner",
            status="active",
            joined_at=datetime.now(UTC),
        )
        await self.repo.add_member(owner_member)

        return saved_project
