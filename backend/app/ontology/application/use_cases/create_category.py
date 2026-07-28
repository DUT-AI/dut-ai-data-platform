from app.ontology.application.dtos import CategoryCreateDTO
from domain.entities import CategoryEntity
from domain.exceptions import BadRequestException, ConflictException, NotFoundException
from domain.interfaces import IOntologyRepository
from shared.utils.id_generator import generate_ulid


class CreateCategoryUseCase:
    def __init__(self, repo: IOntologyRepository):
        self.repo = repo

    async def execute(self, version_id: str, dto: CategoryCreateDTO) -> CategoryEntity:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Ontology Version '{version_id}' not found.")

        if not version.is_editable:
            raise BadRequestException(
                f"Cannot add category to version '{version_id}' with status '{version.status}'. Only draft versions are editable."
            )

        existing = await self.repo.get_category_by_name(version_id, dto.name)
        if existing:
            raise ConflictException(
                f"Category name '{dto.name}' already exists in version '{version_id}'."
            )

        if dto.parent_category_id:
            parent = await self.repo.get_category_by_id(dto.parent_category_id)
            if not parent or parent.ontology_version_id != version_id:
                raise NotFoundException(
                    f"Parent category '{dto.parent_category_id}' not found in version '{version_id}'."
                )

        new_category = CategoryEntity(
            id=generate_ulid(),
            ontology_version_id=version_id,
            name=dto.name,
            display_name=dto.display_name or dto.name,
            description=dto.description,
            color=dto.color,
            parent_category_id=dto.parent_category_id,
            sort_order=dto.sort_order,
        )
        return await self.repo.save_category(new_category)
