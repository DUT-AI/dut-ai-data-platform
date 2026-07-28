from collections.abc import Sequence

from database.models import ProjectMemberModel, ProjectModel
from domain.entities import ProjectEntity, ProjectMemberEntity
from domain.interfaces import IProjectRepository
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class ProjectRepository(IProjectRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, project_id: str) -> ProjectEntity | None:
        stmt = select(ProjectModel).where(ProjectModel.id == project_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def list_by_user(
        self, user_id: str, offset: int = 0, limit: int = 20
    ) -> Sequence[ProjectEntity]:
        stmt = (
            select(ProjectModel)
            .join(ProjectMemberModel, ProjectModel.id == ProjectMemberModel.project_id)
            .where(
                ProjectMemberModel.user_id == user_id,
                ProjectMemberModel.status == "active",
            )
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [model.to_entity() for model in models]

    async def save(self, project: ProjectEntity) -> ProjectEntity:
        model = ProjectModel.from_entity(project)
        self.session.add(model)
        await self.session.flush()
        return model.to_entity()

    async def add_member(self, member: ProjectMemberEntity) -> ProjectMemberEntity:
        model = ProjectMemberModel.from_entity(member)
        self.session.add(model)
        await self.session.flush()
        return model.to_entity()

    async def get_member(
        self, project_id: str, user_id: str
    ) -> ProjectMemberEntity | None:
        stmt = select(ProjectMemberModel).where(
            ProjectMemberModel.project_id == project_id,
            ProjectMemberModel.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None
