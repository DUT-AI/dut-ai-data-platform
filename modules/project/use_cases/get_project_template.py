from typing import Any

from core.exceptions import NotFoundException
from modules.project.domain.catalog_interfaces import IProjectCatalogRepository


class GetProjectTemplateUseCase:
    def __init__(self, catalog_repo: IProjectCatalogRepository) -> None:
        self.catalog_repo = catalog_repo

    async def execute(self, template_id: str) -> dict[str, Any]:
        template = await self.catalog_repo.get_template(template_id)
        if not template:
            raise NotFoundException(f"Project Template '{template_id}' not found.")
        return template
