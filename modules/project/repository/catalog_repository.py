from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.project.domain.catalog_entities import (
    ProjectTemplateEntity,
    ProjectTemplateVersionEntity,
    TaskDefinitionEntity,
    TaskDefinitionVersionEntity,
)
from modules.project.domain.catalog_interfaces import IProjectCatalogRepository
from modules.project.models.catalog import (
    ProjectTemplateModel,
    ProjectTemplateVersionModel,
    TaskDefinitionModel,
    TaskDefinitionVersionModel,
    TemplateProviderCompatibilityModel,
)


def _task_version(m: TaskDefinitionVersionModel) -> TaskDefinitionVersionEntity:
    return TaskDefinitionVersionEntity(
        id=m.id,
        task_definition_id=m.task_definition_id,
        version=m.version,
        input_schema=m.input_schema,
        capability_schema=m.capability_schema,
        constraints=m.constraints_payload,
        status=m.status,
        created_at=m.created_at,
        published_at=m.published_at,
    )


def _template_version(m: ProjectTemplateVersionModel) -> ProjectTemplateVersionEntity:
    return ProjectTemplateVersionEntity(
        id=m.id,
        project_template_id=m.project_template_id,
        version=m.version,
        default_project_configuration=m.default_project_configuration,
        ontology_template_ref=m.ontology_template_ref,
        status=m.status,
        created_at=m.created_at,
        published_at=m.published_at,
    )


class SqlProjectCatalogRepository(IProjectCatalogRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_task_definitions(
        self,
        *,
        category: str | None = None,
        modality: str | None = None,
        provider_key: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        stmt = select(TaskDefinitionModel).where(TaskDefinitionModel.status == "active")
        if category:
            stmt = stmt.where(TaskDefinitionModel.category == category)
        if modality:
            stmt = stmt.where(TaskDefinitionModel.modality == modality)
        if search:
            term = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    TaskDefinitionModel.name.ilike(term),
                    TaskDefinitionModel.description.ilike(term),
                )
            )
        tasks = (
            (
                await self.session.execute(
                    stmt.order_by(
                        TaskDefinitionModel.category, TaskDefinitionModel.name
                    )
                )
            )
            .scalars()
            .all()
        )
        results: list[dict[str, Any]] = []
        for task in tasks:
            versions = (
                (
                    await self.session.execute(
                        select(TaskDefinitionVersionModel).where(
                            TaskDefinitionVersionModel.task_definition_id == task.id,
                            TaskDefinitionVersionModel.status == "published",
                        )
                    )
                )
                .scalars()
                .all()
            )
            templates_stmt = select(ProjectTemplateModel).where(
                ProjectTemplateModel.task_definition_id == task.id,
                ProjectTemplateModel.status == "active",
            )
            templates = (await self.session.execute(templates_stmt)).scalars().all()
            template_payload = []
            for template in templates:
                tvs = (
                    (
                        await self.session.execute(
                            select(ProjectTemplateVersionModel).where(
                                ProjectTemplateVersionModel.project_template_id
                                == template.id,
                                ProjectTemplateVersionModel.status == "published",
                            )
                        )
                    )
                    .scalars()
                    .all()
                )
                version_payload = []
                for tv in tvs:
                    providers = (
                        (
                            await self.session.execute(
                                select(
                                    TemplateProviderCompatibilityModel.provider_key
                                ).where(
                                    TemplateProviderCompatibilityModel.project_template_version_id
                                    == tv.id,
                                    TemplateProviderCompatibilityModel.status
                                    == "active",
                                )
                            )
                        )
                        .scalars()
                        .all()
                    )
                    if provider_key and provider_key not in providers:
                        continue
                    version_payload.append(
                        {**_template_version(tv).__dict__, "providers": list(providers)}
                    )
                if version_payload:
                    template_payload.append(
                        {
                            "id": template.id,
                            "key": template.key,
                            "name": template.name,
                            "description": template.description,
                            "task_definition_id": template.task_definition_id,
                            "status": template.status,
                            "versions": version_payload,
                        }
                    )
            if not provider_key or template_payload:
                results.append(
                    {
                        "id": task.id,
                        "key": task.key,
                        "name": task.name,
                        "description": task.description,
                        "category": task.category,
                        "modality": task.modality,
                        "status": task.status,
                        "versions": [v.__dict__ for v in map(_task_version, versions)],
                        "templates": template_payload,
                    }
                )
        return results

    async def get_task_by_key(self, key: str) -> dict[str, Any] | None:
        items = await self.list_task_definitions()
        return next((item for item in items if item["key"] == key), None)

    async def get_task_by_id(self, task_id: str) -> TaskDefinitionEntity | None:
        model = (
            await self.session.execute(
                select(TaskDefinitionModel).where(TaskDefinitionModel.id == task_id)
            )
        ).scalar_one_or_none()
        if not model:
            return None
        return TaskDefinitionEntity(
            id=model.id,
            key=model.key,
            name=model.name,
            description=model.description,
            category=model.category,
            modality=model.modality,
            status=model.status,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    async def get_task_version(
        self, version_id: str
    ) -> TaskDefinitionVersionEntity | None:
        model = (
            await self.session.execute(
                select(TaskDefinitionVersionModel).where(
                    TaskDefinitionVersionModel.id == version_id
                )
            )
        ).scalar_one_or_none()
        return _task_version(model) if model else None

    async def get_template(self, template_id: str) -> dict[str, Any] | None:
        model = (
            await self.session.execute(
                select(ProjectTemplateModel).where(
                    ProjectTemplateModel.id == template_id
                )
            )
        ).scalar_one_or_none()
        if not model:
            return None
        versions = (
            (
                await self.session.execute(
                    select(ProjectTemplateVersionModel).where(
                        ProjectTemplateVersionModel.project_template_id == model.id
                    )
                )
            )
            .scalars()
            .all()
        )
        version_payload = []
        for version in versions:
            providers = (
                (
                    await self.session.execute(
                        select(TemplateProviderCompatibilityModel.provider_key).where(
                            TemplateProviderCompatibilityModel.project_template_version_id
                            == version.id,
                            TemplateProviderCompatibilityModel.status == "active",
                        )
                    )
                )
                .scalars()
                .all()
            )
            version_payload.append(
                {**_template_version(version).__dict__, "providers": list(providers)}
            )
        return {
            "id": model.id,
            "key": model.key,
            "name": model.name,
            "description": model.description,
            "task_definition_id": model.task_definition_id,
            "status": model.status,
            "versions": version_payload,
        }

    async def get_template_version(
        self, version_id: str
    ) -> ProjectTemplateVersionEntity | None:
        model = (
            await self.session.execute(
                select(ProjectTemplateVersionModel).where(
                    ProjectTemplateVersionModel.id == version_id
                )
            )
        ).scalar_one_or_none()
        return _template_version(model) if model else None

    async def provider_supported(
        self, template_version_id: str, provider_key: str
    ) -> bool:
        return (
            await self.session.execute(
                select(TemplateProviderCompatibilityModel.id).where(
                    TemplateProviderCompatibilityModel.project_template_version_id
                    == template_version_id,
                    TemplateProviderCompatibilityModel.provider_key == provider_key,
                    TemplateProviderCompatibilityModel.status == "active",
                )
            )
        ).scalar_one_or_none() is not None

    async def save_task(self, task: TaskDefinitionEntity) -> TaskDefinitionEntity:
        self.session.add(
            TaskDefinitionModel(
                id=task.id,
                key=task.key,
                name=task.name,
                description=task.description,
                category=task.category,
                modality=task.modality,
                status=task.status,
            )
        )
        await self.session.flush()
        return task

    async def save_task_version(
        self, version: TaskDefinitionVersionEntity
    ) -> TaskDefinitionVersionEntity:
        existing = (
            await self.session.execute(
                select(TaskDefinitionVersionModel).where(
                    TaskDefinitionVersionModel.id == version.id
                )
            )
        ).scalar_one_or_none()
        if existing:
            existing.status = version.status
            existing.published_at = version.published_at
            existing.input_schema = version.input_schema
            existing.capability_schema = version.capability_schema
            existing.constraints_payload = version.constraints
        else:
            self.session.add(
                TaskDefinitionVersionModel(
                    id=version.id,
                    task_definition_id=version.task_definition_id,
                    version=version.version,
                    input_schema=version.input_schema,
                    capability_schema=version.capability_schema,
                    constraints_payload=version.constraints,
                    status=version.status,
                    published_at=version.published_at,
                )
            )
        await self.session.flush()
        return version

    async def save_template(
        self, template: ProjectTemplateEntity
    ) -> ProjectTemplateEntity:
        self.session.add(
            ProjectTemplateModel(
                id=template.id,
                key=template.key,
                name=template.name,
                description=template.description,
                task_definition_id=template.task_definition_id,
                status=template.status,
            )
        )
        await self.session.flush()
        return template

    async def save_template_version(
        self, version: ProjectTemplateVersionEntity
    ) -> ProjectTemplateVersionEntity:
        existing = (
            await self.session.execute(
                select(ProjectTemplateVersionModel).where(
                    ProjectTemplateVersionModel.id == version.id
                )
            )
        ).scalar_one_or_none()
        if existing:
            existing.status = version.status
            existing.published_at = version.published_at
            existing.default_project_configuration = (
                version.default_project_configuration
            )
            existing.ontology_template_ref = version.ontology_template_ref
        else:
            self.session.add(
                ProjectTemplateVersionModel(
                    id=version.id,
                    project_template_id=version.project_template_id,
                    version=version.version,
                    default_project_configuration=version.default_project_configuration,
                    ontology_template_ref=version.ontology_template_ref,
                    status=version.status,
                    published_at=version.published_at,
                )
            )
        await self.session.flush()
        return version

    async def save_provider_compatibilities(
        self, template_version_id: str, provider_keys: list[str]
    ) -> None:
        for provider_key in provider_keys:
            exists = (
                await self.session.execute(
                    select(TemplateProviderCompatibilityModel.id).where(
                        TemplateProviderCompatibilityModel.project_template_version_id
                        == template_version_id,
                        TemplateProviderCompatibilityModel.provider_key == provider_key,
                    )
                )
            ).scalar_one_or_none()
            if not exists:
                self.session.add(
                    TemplateProviderCompatibilityModel(
                        project_template_version_id=template_version_id,
                        provider_key=provider_key,
                        status="active",
                        constraints_payload={},
                    )
                )
        await self.session.flush()
