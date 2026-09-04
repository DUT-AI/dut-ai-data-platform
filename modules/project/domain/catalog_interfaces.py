from typing import Any, Protocol

from modules.project.domain.catalog_entities import (
    ProjectTemplateEntity,
    ProjectTemplateVersionEntity,
    TaskDefinitionEntity,
    TaskDefinitionVersionEntity,
)


class IProjectCatalogRepository(Protocol):
    async def list_task_definitions(
        self,
        *,
        category: str | None = None,
        modality: str | None = None,
        provider_key: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]: ...

    async def get_task_by_key(self, key: str) -> dict[str, Any] | None: ...
    async def get_task_by_id(self, task_id: str) -> TaskDefinitionEntity | None: ...
    async def get_task_version(
        self, version_id: str
    ) -> TaskDefinitionVersionEntity | None: ...
    async def get_template(self, template_id: str) -> dict[str, Any] | None: ...
    async def get_template_version(
        self, version_id: str
    ) -> ProjectTemplateVersionEntity | None: ...
    async def provider_supported(
        self, template_version_id: str, provider_key: str
    ) -> bool: ...
    async def save_task(self, task: TaskDefinitionEntity) -> TaskDefinitionEntity: ...
    async def save_task_version(
        self, version: TaskDefinitionVersionEntity
    ) -> TaskDefinitionVersionEntity: ...
    async def save_template(
        self, template: ProjectTemplateEntity
    ) -> ProjectTemplateEntity: ...
    async def save_template_version(
        self, version: ProjectTemplateVersionEntity
    ) -> ProjectTemplateVersionEntity: ...
    async def save_provider_compatibilities(
        self, template_version_id: str, provider_keys: list[str]
    ) -> None: ...
