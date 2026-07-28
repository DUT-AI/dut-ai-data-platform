from domain.entities import ProjectMemberEntity
from domain.exceptions import ConflictException, NotFoundException
from domain.interfaces import IProjectRepository
from shared.utils.id_generator import generate_ulid

from app.project.application.dtos import ProjectMemberAddDTO


class AddProjectMemberUseCase:
    def __init__(self, repo: IProjectRepository):
        self.repo = repo

    async def execute(
        self, project_id: str, dto: ProjectMemberAddDTO
    ) -> ProjectMemberEntity:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project '{project_id}' not found.")

        existing = await self.repo.get_member(project_id, dto.user_id)
        if existing:
            raise ConflictException(
                f"User '{dto.user_id}' is already a member of project '{project_id}'."
            )

        new_member = ProjectMemberEntity(
            id=generate_ulid(),
            project_id=project_id,
            user_id=dto.user_id,
            role=dto.role,
            status="active",
        )
        return await self.repo.add_member(new_member)
