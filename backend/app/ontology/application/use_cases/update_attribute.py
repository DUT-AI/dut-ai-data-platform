from app.ontology.application.dtos import AttributeUpdateDTO
from domain.entities import AttributeEntity
from domain.exceptions import BadRequestException, NotFoundException
from domain.interfaces import IOntologyRepository


class UpdateAttributeUseCase:
    def __init__(self, repo: IOntologyRepository):
        self.repo = repo

    async def execute(
        self, attribute_id: str, dto: AttributeUpdateDTO
    ) -> AttributeEntity:
        attribute = await self.repo.get_attribute_by_id(attribute_id)
        if not attribute:
            raise NotFoundException(f"Attribute '{attribute_id}' not found.")

        category = await self.repo.get_category_by_id(attribute.category_id)
        if not category:
            raise NotFoundException(f"Category '{attribute.category_id}' not found.")

        version = await self.repo.get_version_by_id(category.ontology_version_id)
        if not version or not version.is_editable:
            raise BadRequestException(
                "Cannot edit attribute of a published or archived version."
            )

        updated_attribute = AttributeEntity(
            id=attribute.id,
            category_id=attribute.category_id,
            name=dto.name if dto.name is not None else attribute.name,
            display_name=dto.display_name
            if dto.display_name is not None
            else attribute.display_name,
            type=dto.type if dto.type is not None else attribute.type,
            required=dto.required if dto.required is not None else attribute.required,
            default_value=dto.default_value
            if dto.default_value is not None
            else attribute.default_value,
            allowed_values=dto.allowed_values
            if dto.allowed_values is not None
            else attribute.allowed_values,
            description=dto.description
            if dto.description is not None
            else attribute.description,
        )
        return await self.repo.save_attribute(updated_attribute)
