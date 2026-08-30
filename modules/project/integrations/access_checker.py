from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.project.domain.access import IProjectAccessChecker
from modules.project.models.project import ProjectMemberModel


class LegacyProjectAccessChecker(IProjectAccessChecker):
    """Temporary adapter over the pre-existing member table."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def accessible_project_ids(self, user_id: str) -> set[str]:
        rows = await self.session.execute(
            select(ProjectMemberModel.project_id).where(
                ProjectMemberModel.user_id == user_id,
                ProjectMemberModel.status == "active",
            )
        )
        return set(rows.scalars().all())
