from typing import Any

from modules.project.domain.catalog_interfaces import IProjectCatalogRepository


class ListProjectTemplatesUseCase:
    def __init__(self, catalog_repo: IProjectCatalogRepository) -> None:
        self.catalog_repo = catalog_repo

    async def execute(
        self,
        group: str | None = None,
        modality: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        return await self.catalog_repo.list_templates(
            group=group, modality=modality, search=search
        )
