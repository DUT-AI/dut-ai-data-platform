from core.exceptions import BadRequestException, NotFoundException
from modules.project.domain.interfaces import IProjectRepository


class RemoveProjectMemberUseCase:
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str, member_id: str) -> None:
        member = await self.repo.get_member(project_id, member_id)
        if not member:
            raise NotFoundException(f"Member '{member_id}' not found in project.")
        if member.role == "owner":
            raise BadRequestException("Cannot remove project owner from project.")

        await self.repo.remove_member(project_id, member_id)
