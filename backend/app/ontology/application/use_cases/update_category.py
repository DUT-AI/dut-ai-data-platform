from app.ontology.application.dtos import CategoryUpdateDTO
from domain.entities import CategoryEntity
from domain.exceptions import BadRequestException, NotFoundException
from domain.interfaces import IOntologyRepository


class UpdateCategoryUseCase:
    def __init__(self, repo: IOntologyRepository):
        self.repo = repo

    async def execute(self, category_id: str, dto: CategoryUpdateDTO) -> CategoryEntity:
        category = await self.repo.get_category_by_id(category_id)
        if not category:
            raise NotFoundException(f"Category '{category_id}' not found.")

        version = await self.repo.get_version_by_id(category.ontology_version_id)
        if not version or not version.is_editable:
            raise BadRequestException(
                "Cannot edit category of a published or archived version."
            )

        updated_category = CategoryEntity(
            id=category.id,
            ontology_version_id=category.ontology_version_id,
            name=dto.name if dto.name is not None else category.name,
            display_name=dto.display_name
            if dto.display_name is not None
            else category.display_name,
            description=dto.description
            if dto.description is not None
            else category.description,
            color=dto.color if dto.color is not None else category.color,
            parent_category_id=dto.parent_category_id
            if dto.parent_category_id is not None
            else category.parent_category_id,
            sort_order=dto.sort_order
            if dto.sort_order is not None
            else category.sort_order,
            attributes=category.attributes,
        )
        return await self.repo.save_category(updated_category)
