from collections.abc import Sequence

from sqlalchemy import delete, or_, select
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
        self,
        user_id: str,
        offset: int = 0,
        limit: int = 20,
        status: str | None = None,
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
        )
        if status:
            stmt = stmt.where(ProjectModel.status == status)

        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [model.to_entity() for model in models]

    async def list_projects(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        status: str | None = None,
        task_definition_version_id: str | None = None,
        search: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        accessible_project_ids: set[str] | None = None,
        created_by: str | None = None,
    ) -> Sequence[ProjectEntity]:
        stmt = select(ProjectModel)
        if accessible_project_ids is not None and created_by:
            stmt = stmt.where(
                or_(
                    ProjectModel.id.in_(accessible_project_ids),
                    ProjectModel.created_by == created_by,
                )
            )
        if status:
            stmt = stmt.where(ProjectModel.status == status)
        if task_definition_version_id:
            stmt = stmt.where(
                ProjectModel.task_definition_version_id == task_definition_version_id
            )
        if search:
            term = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(ProjectModel.name.ilike(term), ProjectModel.description.ilike(term))
            )
        order_column = (
            ProjectModel.updated_at
            if sort_by == "updated_at"
            else ProjectModel.created_at
        )
        stmt = stmt.order_by(
            order_column.asc() if sort_order == "asc" else order_column.desc()
        )
        result = await self.session.execute(stmt.offset(offset).limit(limit))
        return [model.to_entity() for model in result.scalars().all()]

    async def save(self, project: ProjectEntity) -> ProjectEntity:
        stmt = select(ProjectModel).where(ProjectModel.id == project.id)
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            existing.name = project.name
            existing.description = project.description
            existing.status = project.status
            existing.task_definition_version_id = project.task_definition_version_id
            existing.project_template_version_id = project.project_template_version_id
            existing.created_by = project.created_by
            existing.archived_at = project.archived_at
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
        if not model:
            return None
        return {
            "annotation_provider_key": model.annotation_provider_key,
            "storage_provider_key": model.storage_provider_key,
            "default_workflow_ref": model.default_workflow_ref,
            "settings": model.settings,
            "settings_schema_version": model.settings_schema_version,
        }

    async def save_configuration(self, project_id: str, settings: dict) -> dict:
        stmt = select(ProjectConfigurationModel).where(
            ProjectConfigurationModel.project_id == project_id
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            model.settings = settings.get("settings", model.settings)
            model.annotation_provider_key = settings.get(
                "annotation_provider_key", model.annotation_provider_key
            )
            model.storage_provider_key = settings.get(
                "storage_provider_key", model.storage_provider_key
            )
            model.default_workflow_ref = settings.get(
                "default_workflow_ref", model.default_workflow_ref
            )
            model.settings_schema_version = settings.get(
                "settings_schema_version", model.settings_schema_version
            )
        else:
            model = ProjectConfigurationModel(
                project_id=project_id,
                settings=settings.get("settings", {}),
                annotation_provider_key=settings.get(
                    "annotation_provider_key", "label_studio"
                ),
                storage_provider_key=settings.get("storage_provider_key", "minio"),
                default_workflow_ref=settings.get("default_workflow_ref"),
                settings_schema_version=settings.get("settings_schema_version", "1.0"),
            )
            self.session.add(model)
        await self.session.flush()
        return {
            "annotation_provider_key": model.annotation_provider_key,
            "storage_provider_key": model.storage_provider_key,
            "default_workflow_ref": model.default_workflow_ref,
            "settings": model.settings,
            "settings_schema_version": model.settings_schema_version,
        }
