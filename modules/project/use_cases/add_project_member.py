from core.exceptions import ConflictException
from modules.identity.client.manage_client import ManageClient
from modules.project.domain.entities import ProjectMemberEntity
from modules.project.domain.interfaces import IProjectRepository
from modules.project.dtos.project_dtos import (
    ProjectMemberAddDTO,
    ProjectMemberResponseDTO,
)


class AddProjectMemberUseCase:
    def __init__(
        self,
        repo: IProjectRepository,
        manage_client: ManageClient,
    ) -> None:
        self.repo = repo
        self.manage_client = manage_client

    async def execute(
        self, project_id: str, data: ProjectMemberAddDTO
    ) -> ProjectMemberResponseDTO:
        existing = await self.repo.get_member(project_id, data.user_id)
        if existing:
            raise ConflictException("User is already a member of this project.")

        member = ProjectMemberEntity(
            project_id=project_id,
            user_id=data.user_id,
            role=data.role,
            status="active",
        )
        saved = await self.repo.add_member(member)
        dto = ProjectMemberResponseDTO.model_validate(saved)

        users_resp = await self.manage_client.list_users(page=1, page_size=100)
        for u in users_resp.items:
            if str(u.id) == str(dto.user_id):
                dto.user_name = u.name
                dto.user_email = u.email
                dto.user_avatar_url = u.avatar_url
                break

        return dto
