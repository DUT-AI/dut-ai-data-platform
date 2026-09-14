from typing import Any, Protocol

from modules.project.domain.catalog_entities import ProjectTemplateEntity


class IProjectCatalogRepository(Protocol):
    async def list_templates(
        self,
        *,
        group: str | None = None,
        modality: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]: ...

    async def list_template_groups(self) -> list[str]: ...

    async def get_template(self, template_id: str) -> dict[str, Any] | None: ...
    async def get_template_by_key(self, key: str) -> dict[str, Any] | None: ...

