from domain.exceptions import NotFoundException
from domain.interfaces import IProjectRepository


class RemoveProjectMemberUseCase:
    def __init__(self, repo: IProjectRepository):
        self.repo = repo

    async def execute(self, project_id: str, member_id: str) -> bool:
        removed = await self.repo.remove_member(project_id, member_id)
        if not removed:
            raise NotFoundException(
                f"Member '{member_id}' not found in project '{project_id}'."
            )
        return True
