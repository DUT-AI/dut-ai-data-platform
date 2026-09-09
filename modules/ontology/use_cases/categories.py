from core.exceptions import ConflictException, NotFoundException
from modules.ontology.domain.entities import CategoryEntity
from modules.ontology.domain.interfaces import ICategoryRepository, IOntologyRepository
from modules.ontology.dtos import (
    CategoryCreateDTO,
    CategoryResponseDTO,
    CategoryUpdateDTO,
)
from modules.ontology.use_cases.common import require_ontology, require_unlocked


class _CategoryUseCaseBase:
    def __init__(
        self, repo: ICategoryRepository, ontologies: IOntologyRepository
    ) -> None:
        self.repo, self.ontologies = repo, ontologies

    async def list(
        self, project_id: str, ontology_id: str
    ) -> list[CategoryResponseDTO]:
        await require_ontology(self.ontologies, project_id, ontology_id)
        return [
            CategoryResponseDTO.model_validate(item)
            for item in await self.repo.list_by_ontology(ontology_id)
        ]

    async def get(
        self, project_id: str, ontology_id: str, entity_id: str
    ) -> CategoryResponseDTO:
        await require_ontology(self.ontologies, project_id, ontology_id)
        item = await self.repo.get(entity_id)
        if item is None or item.ontology_id != ontology_id:
            raise NotFoundException("Category không tồn tại.")
        return CategoryResponseDTO.model_validate(item)

    async def create(
        self, project_id: str, ontology_id: str, data: CategoryCreateDTO
    ) -> CategoryResponseDTO:
        await require_ontology(self.ontologies, project_id, ontology_id)
        if await self.repo.get_by_key(ontology_id, data.key):
            raise ConflictException("Key Category đã tồn tại trong Ontology.")
        return CategoryResponseDTO.model_validate(
            await self.repo.add(
                CategoryEntity(ontology_id=ontology_id, **data.model_dump())
            )
        )

    async def update(
        self, project_id: str, ontology_id: str, entity_id: str, data: CategoryUpdateDTO
    ) -> CategoryResponseDTO:
        await require_ontology(self.ontologies, project_id, ontology_id)
        item = await self.repo.get(entity_id)
        if item is None or item.ontology_id != ontology_id:
            raise NotFoundException("Category không tồn tại.")
        require_unlocked(await self.repo.is_locked(entity_id), "Category")
        if data.key is not None:
            duplicate = await self.repo.get_by_key(ontology_id, data.key)
            if duplicate is not None and duplicate.id != entity_id:
                raise ConflictException("Key Category đã tồn tại trong Ontology.")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(item, key, value)
        return CategoryResponseDTO.model_validate(await self.repo.update(item))

    async def delete(self, project_id: str, ontology_id: str, entity_id: str) -> None:
        await self.get(project_id, ontology_id, entity_id)
        require_unlocked(await self.repo.is_locked(entity_id), "Category")
        await self.repo.delete(entity_id)


class ListCategoriesUseCase(_CategoryUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str):
        return await self.list(project_id, ontology_id)


class GetCategoryUseCase(_CategoryUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str, category_id: str):
        return await self.get(project_id, ontology_id, category_id)


class CreateCategoryUseCase(_CategoryUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str, data: CategoryCreateDTO):
        return await self.create(project_id, ontology_id, data)


class UpdateCategoryUseCase(_CategoryUseCaseBase):
    async def execute(
        self,
        project_id: str,
        ontology_id: str,
        category_id: str,
        data: CategoryUpdateDTO,
    ):
        return await self.update(project_id, ontology_id, category_id, data)


class DeleteCategoryUseCase(_CategoryUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str, category_id: str):
        await self.delete(project_id, ontology_id, category_id)
