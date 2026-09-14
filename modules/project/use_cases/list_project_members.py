from loguru import logger

from modules.identity.client.manage_client import ManageClient
from modules.project.domain.interfaces import IProjectRepository
from modules.project.dtos.project_dtos import ProjectMemberResponseDTO


class ListProjectMembersUseCase:
    def __init__(
        self,
        repo: IProjectRepository,
        manage_client: ManageClient,
    ) -> None:
        self.repo = repo
        self.manage_client = manage_client

    async def execute(self, project_id: str) -> list[ProjectMemberResponseDTO]:
        members = await self.repo.list_members(project_id)
        dtos = [ProjectMemberResponseDTO.model_validate(m) for m in members]

        if not dtos:
            return []

        try:
            users_resp = await self.manage_client.list_users(page=1, page_size=100)
            users_map = {str(u.id): u for u in users_resp.items}
            for dto in dtos:
                user_info = users_map.get(str(dto.user_id))
                if user_info:
                    dto.user_name = user_info.name
                    dto.user_email = user_info.email
                    dto.user_avatar_url = user_info.avatar_url
        except Exception as exc:
            logger.warning(
                "Failed to fetch user profiles for project members from ManageClient: %s",
                exc,
            )

        return dtos
