from domain.exceptions import BadRequestException, NotFoundException
from domain.interfaces import IOntologyRepository


class DeleteCategoryUseCase:
    def __init__(self, repo: IOntologyRepository):
        self.repo = repo

    async def execute(self, category_id: str) -> bool:
        category = await self.repo.get_category_by_id(category_id)
        if not category:
            raise NotFoundException(f"Category '{category_id}' not found.")

        version = await self.repo.get_version_by_id(category.ontology_version_id)
        if not version or not version.is_editable:
            raise BadRequestException(
                "Cannot delete category from a published or archived version."
            )

        return await self.repo.delete_category(category_id)
