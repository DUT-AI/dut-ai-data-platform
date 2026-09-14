from core.exceptions import NotFoundException
from modules.project.domain.interfaces import IProjectRepository
from modules.project.dtos.project_dtos import (
    ProjectMemberResponseDTO,
    ProjectMemberUpdateDTO,
)


class UpdateProjectMemberUseCase:
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(
        self, project_id: str, member_id: str, data: ProjectMemberUpdateDTO
    ) -> ProjectMemberResponseDTO:
        member = await self.repo.get_member(project_id, member_id)
        if not member:
            raise NotFoundException(f"Member '{member_id}' not found in project.")

        if data.role is not None:
            member.role = data.role
        if data.status is not None:
            member.status = data.status

        saved = await self.repo.update_member(member)
        return ProjectMemberResponseDTO.model_validate(saved)
