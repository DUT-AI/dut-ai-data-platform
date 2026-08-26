from collections.abc import Sequence

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.project.domain.entities import ProjectEntity, ProjectMemberEntity
from modules.project.domain.interfaces import IProjectRepository
from modules.project.models.project import (
    ProjectConfigurationModel,
    ProjectMemberModel,
    ProjectModel,
)


class SqlProjectRepository(IProjectRepository):
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
            .join(
                ProjectMemberModel,
                ProjectModel.id == ProjectMemberModel.project_id,
            )
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
        stmt = select(ProjectModel).where(ProjectModel.id == project.id)
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            existing.name = project.name
            existing.description = project.description
            existing.status = project.status
            existing.project_type = project.project_type
            await self.session.flush()
            await self.session.refresh(existing)
            return existing.to_entity()

        model = ProjectModel.from_entity(project)
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return model.to_entity()

    async def add_member(self, member: ProjectMemberEntity) -> ProjectMemberEntity:
        model = ProjectMemberModel.from_entity(member)
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return model.to_entity()

    async def get_member(
        self, project_id: str, user_id: str
    ) -> ProjectMemberEntity | None:
        stmt = select(ProjectMemberModel).where(
            ProjectMemberModel.project_id == project_id,
            (ProjectMemberModel.user_id == user_id)
            | (ProjectMemberModel.id == user_id),
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def list_members(self, project_id: str) -> Sequence[ProjectMemberEntity]:
        stmt = select(ProjectMemberModel).where(
            ProjectMemberModel.project_id == project_id
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [m.to_entity() for m in models]

    async def update_member(self, member: ProjectMemberEntity) -> ProjectMemberEntity:
        stmt = select(ProjectMemberModel).where(
            ProjectMemberModel.id == member.id,
            ProjectMemberModel.project_id == member.project_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            model.role = member.role
            model.status = member.status
            await self.session.flush()
            await self.session.refresh(model)
            return model.to_entity()
        return member

    async def remove_member(self, project_id: str, member_id: str) -> bool:
        stmt = delete(ProjectMemberModel).where(
            ProjectMemberModel.project_id == project_id,
            (ProjectMemberModel.id == member_id)
            | (ProjectMemberModel.user_id == member_id),
        )
        res = await self.session.execute(stmt)
        await self.session.flush()
        rowcount = getattr(res, "rowcount", 0)
        return int(rowcount or 0) > 0

    async def get_configuration(self, project_id: str) -> dict | None:
        stmt = select(ProjectConfigurationModel).where(
            ProjectConfigurationModel.project_id == project_id
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.settings if model else None

    async def save_configuration(self, project_id: str, settings: dict) -> dict:
        stmt = select(ProjectConfigurationModel).where(
            ProjectConfigurationModel.project_id == project_id
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            model.settings = settings
        else:
            model = ProjectConfigurationModel(project_id=project_id, settings=settings)
            self.session.add(model)
        await self.session.flush()
        return model.settings
