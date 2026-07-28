from domain.entities import ProjectMemberEntity
from domain.exceptions import NotFoundException
from domain.interfaces import IProjectRepository

from app.project.application.dtos import ProjectMemberUpdateDTO


class UpdateProjectMemberUseCase:
    def __init__(self, repo: IProjectRepository):
        self.repo = repo

    async def execute(
        self, project_id: str, member_id: str, dto: ProjectMemberUpdateDTO
    ) -> ProjectMemberEntity:
        member = await self.repo.get_member(project_id, member_id)
        if not member:
            # Fallback check if member_id is ULID
            members = await self.repo.list_members(project_id)
            target = next((m for m in members if m.id == member_id), None)
            if not target:
                raise NotFoundException(
                    f"Member '{member_id}' not found in project '{project_id}'."
                )
            member = target

        updated = ProjectMemberEntity(
            id=member.id,
            project_id=member.project_id,
            user_id=member.user_id,
            role=dto.role if dto.role is not None else member.role,
            status=dto.status if dto.status is not None else member.status,
            joined_at=member.joined_at,
        )
        return await self.repo.update_member(updated)
