from modules.project.domain.catalog_interfaces import IProjectCatalogRepository


class ListTemplateGroupsUseCase:
    def __init__(self, catalog_repo: IProjectCatalogRepository) -> None:
        self.catalog_repo = catalog_repo

    async def execute(self) -> list[str]:
        return await self.catalog_repo.list_template_groups()
