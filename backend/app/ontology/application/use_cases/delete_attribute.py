from domain.exceptions import BadRequestException, NotFoundException
from domain.interfaces import IOntologyRepository


class DeleteAttributeUseCase:
    def __init__(self, repo: IOntologyRepository):
        self.repo = repo

    async def execute(self, attribute_id: str) -> bool:
        attribute = await self.repo.get_attribute_by_id(attribute_id)
        if not attribute:
            raise NotFoundException(f"Attribute '{attribute_id}' not found.")

        category = await self.repo.get_category_by_id(attribute.category_id)
        if not category:
            raise NotFoundException(f"Category '{attribute.category_id}' not found.")

        version = await self.repo.get_version_by_id(category.ontology_version_id)
        if not version or not version.is_editable:
            raise BadRequestException(
                "Cannot delete attribute from a published or archived version."
            )

        return await self.repo.delete_attribute(attribute_id)
