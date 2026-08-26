from core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)
from core.utils.datetime_utils import now_utc
from modules.ontology.domain.entities import (
    AttributeEntity,
    CategoryEntity,
    OntologyEntity,
    OntologyVersionEntity,
)
from modules.ontology.domain.interfaces import IOntologyRepository
from modules.ontology.dtos.ontology_dtos import (
    AttributeCreateDTO,
    AttributeResponseDTO,
    AttributeUpdateDTO,
    CategoryCreateDTO,
    CategoryResponseDTO,
    CategoryUpdateDTO,
    OntologyCreateDTO,
    OntologyResponseDTO,
    OntologyVersionCreateDTO,
    OntologyVersionResponseDTO,
)


class CreateOntologyUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(
        self, project_id: str, data: OntologyCreateDTO
    ) -> OntologyResponseDTO:
        ontology = OntologyEntity(
            project_id=project_id,
            name=data.name,
            description=data.description,
        )
        saved = await self.repo.save_ontology(ontology)

        # Create initial default v1.0.0 draft version
        initial_version = OntologyVersionEntity(
            ontology_id=saved.id,
            version="v1.0.0",
            status="draft",
        )
        saved_ver = await self.repo.save_version(initial_version)
        saved.versions = [saved_ver]

        return OntologyResponseDTO.model_validate(saved)


class ListProjectOntologiesUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str) -> list[OntologyResponseDTO]:
        ontologies = await self.repo.list_ontologies_by_project(project_id)
        return [OntologyResponseDTO.model_validate(o) for o in ontologies]


class CreateOntologyVersionUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(
        self, ontology_id: str, data: OntologyVersionCreateDTO
    ) -> OntologyVersionResponseDTO:
        ontology = await self.repo.get_ontology_by_id(ontology_id)
        if not ontology:
            raise NotFoundException(f"Ontology '{ontology_id}' not found.")

        # Check existing version
        for v in ontology.versions:
            if v.version == data.version:
                raise ConflictException(
                    f"Version '{data.version}' already exists for this ontology."
                )

        new_version = OntologyVersionEntity(
            ontology_id=ontology_id,
            version=data.version,
            status="draft",
        )
        saved = await self.repo.save_version(new_version)
        return OntologyVersionResponseDTO.model_validate(saved)


class GetOntologyVersionDetailUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(self, version_id: str) -> OntologyVersionResponseDTO:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Ontology version '{version_id}' not found.")
        return OntologyVersionResponseDTO.model_validate(version)


class PublishOntologyVersionUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(self, version_id: str) -> OntologyVersionResponseDTO:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Ontology version '{version_id}' not found.")
        if version.status == "published":
            raise BadRequestException("Version is already published.")

        version.status = "published"
        version.published_at = now_utc()
        saved = await self.repo.save_version(version)
        return OntologyVersionResponseDTO.model_validate(saved)


class CloneOntologyVersionUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(
        self, source_version_id: str, new_version_name: str
    ) -> OntologyVersionResponseDTO:
        cloned = await self.repo.clone_version(source_version_id, new_version_name)
        return OntologyVersionResponseDTO.model_validate(cloned)


class CreateCategoryUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(
        self, version_id: str, data: CategoryCreateDTO
    ) -> CategoryResponseDTO:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Ontology version '{version_id}' not found.")
        if not version.is_editable:
            raise BadRequestException(
                f"Cannot modify published version '{version.version}'."
            )

        existing = await self.repo.get_category_by_name(version_id, data.name)
        if existing:
            raise ConflictException(
                f"Category '{data.name}' already exists in this version."
            )

        category = CategoryEntity(
            ontology_version_id=version_id,
            name=data.name,
            display_name=data.display_name,
            description=data.description,
            color=data.color,
            parent_category_id=data.parent_category_id,
            sort_order=data.sort_order,
        )
        saved = await self.repo.save_category(category)
        return CategoryResponseDTO.model_validate(saved)


class UpdateCategoryUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(
        self, category_id: str, data: CategoryUpdateDTO
    ) -> CategoryResponseDTO:
        category = await self.repo.get_category_by_id(category_id)
        if not category:
            raise NotFoundException(f"Category '{category_id}' not found.")

        version = await self.repo.get_version_by_id(category.ontology_version_id)
        if not version or not version.is_editable:
            raise BadRequestException("Cannot modify category in a published version.")

        if data.name is not None:
            category.name = data.name
        if data.display_name is not None:
            category.display_name = data.display_name
        if data.description is not None:
            category.description = data.description
        if data.color is not None:
            category.color = data.color
        if data.parent_category_id is not None:
            category.parent_category_id = data.parent_category_id
        if data.sort_order is not None:
            category.sort_order = data.sort_order

        saved = await self.repo.save_category(category)
        return CategoryResponseDTO.model_validate(saved)


class DeleteCategoryUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(self, category_id: str) -> None:
        category = await self.repo.get_category_by_id(category_id)
        if not category:
            raise NotFoundException(f"Category '{category_id}' not found.")

        version = await self.repo.get_version_by_id(category.ontology_version_id)
        if not version or not version.is_editable:
            raise BadRequestException(
                "Cannot delete category from a published version."
            )

        await self.repo.delete_category(category_id)


class CreateAttributeUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(
        self, category_id: str, data: AttributeCreateDTO
    ) -> AttributeResponseDTO:
        category = await self.repo.get_category_by_id(category_id)
        if not category:
            raise NotFoundException(f"Category '{category_id}' not found.")

        version = await self.repo.get_version_by_id(category.ontology_version_id)
        if not version or not version.is_editable:
            raise BadRequestException("Cannot add attributes to a published version.")

        existing = await self.repo.get_attribute_by_name(category_id, data.name)
        if existing:
            raise ConflictException(
                f"Attribute '{data.name}' already exists for category '{category.name}'."
            )

        attribute = AttributeEntity(
            category_id=category_id,
            name=data.name,
            display_name=data.display_name,
            type=data.type,
            required=data.required,
            default_value=data.default_value,
            allowed_values=data.allowed_values,
            description=data.description,
        )
        saved = await self.repo.save_attribute(attribute)
        return AttributeResponseDTO.model_validate(saved)


class UpdateAttributeUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(
        self, attribute_id: str, data: AttributeUpdateDTO
    ) -> AttributeResponseDTO:
        attribute = await self.repo.get_attribute_by_id(attribute_id)
        if not attribute:
            raise NotFoundException(f"Attribute '{attribute_id}' not found.")

        category = await self.repo.get_category_by_id(attribute.category_id)
        if category:
            version = await self.repo.get_version_by_id(category.ontology_version_id)
            if not version or not version.is_editable:
                raise BadRequestException(
                    "Cannot modify attribute in a published version."
                )

        if data.name is not None:
            attribute.name = data.name
        if data.display_name is not None:
            attribute.display_name = data.display_name
        if data.type is not None:
            attribute.type = data.type
        if data.required is not None:
            attribute.required = data.required
        if data.default_value is not None:
            attribute.default_value = data.default_value
        if data.allowed_values is not None:
            attribute.allowed_values = data.allowed_values
        if data.description is not None:
            attribute.description = data.description

        saved = await self.repo.save_attribute(attribute)
        return AttributeResponseDTO.model_validate(saved)


class DeleteAttributeUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(self, attribute_id: str) -> None:
        attribute = await self.repo.get_attribute_by_id(attribute_id)
        if not attribute:
            raise NotFoundException(f"Attribute '{attribute_id}' not found.")

        category = await self.repo.get_category_by_id(attribute.category_id)
        if category:
            version = await self.repo.get_version_by_id(category.ontology_version_id)
            if not version or not version.is_editable:
                raise BadRequestException(
                    "Cannot delete attribute from a published version."
                )

        await self.repo.delete_attribute(attribute_id)


class UpdateOntologyVersionUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(
        self, version_id: str, raw_label_config: str | None
    ) -> OntologyVersionResponseDTO:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Ontology version '{version_id}' not found.")

        version.raw_label_config = raw_label_config
        saved = await self.repo.save_version(version)
        return OntologyVersionResponseDTO.model_validate(saved)
