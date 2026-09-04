from typing import Any

from core.exceptions import BadRequestException, NotFoundException
from core.utils.datetime_utils import now_utc
from modules.project.domain.catalog_entities import (
    ProjectTemplateEntity,
    ProjectTemplateVersionEntity,
    TaskDefinitionEntity,
    TaskDefinitionVersionEntity,
)
from modules.project.domain.catalog_interfaces import IProjectCatalogRepository
from modules.project.domain.events import IProjectEventPublisher, ProjectDomainEvent


class ListTaskDefinitionsUseCase:
    def __init__(self, catalog_repo: IProjectCatalogRepository) -> None:
        self.catalog_repo = catalog_repo

    async def execute(self, **filters: Any) -> list[dict[str, Any]]:
        return await self.catalog_repo.list_task_definitions(**filters)


class GetTaskDefinitionUseCase:
    def __init__(self, catalog_repo: IProjectCatalogRepository) -> None:
        self.catalog_repo = catalog_repo

    async def execute(self, key: str) -> dict[str, Any]:
        task = await self.catalog_repo.get_task_by_key(key)
        if not task:
            raise NotFoundException(f"Task Definition '{key}' not found.")
        return task


class GetProjectTemplateUseCase:
    def __init__(self, catalog_repo: IProjectCatalogRepository) -> None:
        self.catalog_repo = catalog_repo

    async def execute(self, template_id: str) -> dict[str, Any]:
        template = await self.catalog_repo.get_template(template_id)
        if not template:
            raise NotFoundException(f"Project Template '{template_id}' not found.")
        template["versions"] = [
            version
            for version in template["versions"]
            if version["status"] == "published"
        ]
        return template


class GetProjectTemplateVersionUseCase:
    def __init__(self, catalog_repo: IProjectCatalogRepository) -> None:
        self.catalog_repo = catalog_repo

    async def execute(self, template_id: str, version: str) -> dict[str, Any]:
        template = await self.catalog_repo.get_template(template_id)
        if not template:
            raise NotFoundException(f"Project Template '{template_id}' not found.")
        match = next(
            (item for item in template["versions"] if item["version"] == version), None
        )
        if not match:
            raise NotFoundException(
                f"Project Template version '{version}' was not found."
            )
        return match


class CreateTaskDefinitionUseCase:
    def __init__(self, catalog_repo: IProjectCatalogRepository) -> None:
        self.catalog_repo = catalog_repo

    async def execute(self, data: dict[str, Any]) -> dict[str, Any]:
        if await self.catalog_repo.get_task_by_key(data["key"]):
            raise BadRequestException("Task Definition key already exists.")
        task = TaskDefinitionEntity(**data)
        await self.catalog_repo.save_task(task)
        return task.__dict__


class CreateTaskDefinitionVersionUseCase:
    def __init__(self, catalog_repo: IProjectCatalogRepository) -> None:
        self.catalog_repo = catalog_repo

    async def execute(self, task_id: str, data: dict[str, Any]) -> dict[str, Any]:
        if not await self.catalog_repo.get_task_by_id(task_id):
            raise NotFoundException("Task Definition not found.")
        version = TaskDefinitionVersionEntity(task_definition_id=task_id, **data)
        await self.catalog_repo.save_task_version(version)
        return version.__dict__


class ChangeTaskDefinitionVersionStatusUseCase:
    def __init__(
        self,
        catalog_repo: IProjectCatalogRepository,
        event_publisher: IProjectEventPublisher,
    ) -> None:
        self.catalog_repo = catalog_repo
        self.event_publisher = event_publisher

    async def execute(self, version_id: str, status: str) -> dict[str, Any]:
        if status not in {"published", "deprecated"}:
            raise BadRequestException("Unsupported Task Definition Version status.")
        version = await self.catalog_repo.get_task_version(version_id)
        if not version:
            raise NotFoundException("Task Definition Version not found.")
        if version.status == "deprecated" and status == "published":
            raise BadRequestException("Deprecated versions cannot be republished.")
        version.status = status
        if status == "published" and version.published_at is None:
            version.published_at = now_utc()
        await self.catalog_repo.save_task_version(version)
        if status == "published":
            await self.event_publisher.publish(
                ProjectDomainEvent(
                    event_type="TaskDefinitionVersionPublished",
                    project_id="catalog",
                    payload={"task_definition_version_id": version.id},
                )
            )
        return version.__dict__


class CreateProjectTemplateUseCase:
    def __init__(self, catalog_repo: IProjectCatalogRepository) -> None:
        self.catalog_repo = catalog_repo

    async def execute(self, data: dict[str, Any]) -> dict[str, Any]:
        if not await self.catalog_repo.get_task_by_id(data["task_definition_id"]):
            raise NotFoundException("Task Definition not found.")
        template = ProjectTemplateEntity(
            key=data["key"],
            name=data["name"],
            description=data.get("description"),
            task_definition_id=data["task_definition_id"],
        )
        return (await self.catalog_repo.save_template(template)).__dict__


class CreateProjectTemplateVersionUseCase:
    def __init__(self, catalog_repo: IProjectCatalogRepository) -> None:
        self.catalog_repo = catalog_repo

    async def execute(self, template_id: str, data: dict[str, Any]) -> dict[str, Any]:
        if not await self.catalog_repo.get_template(template_id):
            raise NotFoundException("Project Template not found.")
        version = ProjectTemplateVersionEntity(
            project_template_id=template_id,
            version=data["version"],
            default_project_configuration=data.get("default_project_configuration", {}),
            ontology_template_ref=data.get("ontology_template_ref"),
        )
        await self.catalog_repo.save_template_version(version)
        await self.catalog_repo.save_provider_compatibilities(
            version.id, data.get("provider_keys", [])
        )
        return version.__dict__


class ChangeProjectTemplateVersionStatusUseCase:
    def __init__(
        self,
        catalog_repo: IProjectCatalogRepository,
        event_publisher: IProjectEventPublisher,
    ) -> None:
        self.catalog_repo = catalog_repo
        self.event_publisher = event_publisher

    async def execute(self, version_id: str, status: str) -> dict[str, Any]:
        if status not in {"published", "deprecated"}:
            raise BadRequestException("Unsupported Project Template Version status.")
        version = await self.catalog_repo.get_template_version(version_id)
        if not version:
            raise NotFoundException("Project Template Version not found.")
        if version.status == "deprecated" and status == "published":
            raise BadRequestException("Deprecated versions cannot be republished.")
        version.status = status
        if status == "published":
            version.published_at = now_utc()
        await self.catalog_repo.save_template_version(version)
        if status == "published":
            await self.event_publisher.publish(
                ProjectDomainEvent(
                    event_type="ProjectTemplatePublished",
                    project_id="catalog",
                    payload={"project_template_version_id": version.id},
                )
            )
        return version.__dict__
