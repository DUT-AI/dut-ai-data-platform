from app.ontology.application.dtos import AttributeCreateDTO
from domain.entities import AttributeEntity
from domain.exceptions import BadRequestException, ConflictException, NotFoundException
from domain.interfaces import IOntologyRepository
from shared.utils.id_generator import generate_ulid


class CreateAttributeUseCase:
    def __init__(self, repo: IOntologyRepository):
        self.repo = repo

    async def execute(
        self, category_id: str, dto: AttributeCreateDTO
    ) -> AttributeEntity:
        category = await self.repo.get_category_by_id(category_id)
        if not category:
            raise NotFoundException(f"Category '{category_id}' not found.")

        version = await self.repo.get_version_by_id(category.ontology_version_id)
        if not version or not version.is_editable:
            raise BadRequestException(
                "Cannot add attribute to a published or archived version."
            )

        existing = await self.repo.get_attribute_by_name(category_id, dto.name)
        if existing:
            raise ConflictException(
                f"Attribute name '{dto.name}' already exists in category '{category_id}'."
            )

        new_attribute = AttributeEntity(
            id=generate_ulid(),
            category_id=category_id,
            name=dto.name,
            display_name=dto.display_name or dto.name,
            type=dto.type,
            required=dto.required,
            default_value=dto.default_value,
            allowed_values=dto.allowed_values,
            description=dto.description,
        )
        return await self.repo.save_attribute(new_attribute)
