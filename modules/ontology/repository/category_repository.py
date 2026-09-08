from collections.abc import Sequence

from sqlalchemy import delete, exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.ontology.domain.entities import CategoryEntity
from modules.ontology.domain.interfaces import ICategoryRepository
from modules.ontology.models import (
    CategoryModel,
    OntologyVersionModel,
    OntologyVersionOutputCategoryModel,
)
from modules.ontology.repository._mappers import map_category


class SqlCategoryRepository(ICategoryRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, entity: CategoryEntity) -> CategoryEntity:
        model = CategoryModel(
            id=entity.id,
            ontology_id=entity.ontology_id,
            key=entity.key,
            name=entity.name,
            color=entity.color,
            description=entity.description,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return map_category(model)

    async def get(self, entity_id: str) -> CategoryEntity | None:
        model = await self._session.get(CategoryModel, entity_id)
        if model is None:
            return None
        entity = map_category(model)
        entity.locked = await self.is_locked(entity.id)
        return entity

    async def list_by_ontology(self, ontology_id: str) -> Sequence[CategoryEntity]:
        models = (
            (
                await self._session.execute(
                    select(CategoryModel)
                    .where(CategoryModel.ontology_id == ontology_id)
                    .order_by(CategoryModel.name)
                )
            )
            .scalars()
            .all()
        )
        locked = set(
            (
                await self._session.execute(
                    select(OntologyVersionOutputCategoryModel.category_id)
                    .join(
                        OntologyVersionModel,
                        OntologyVersionModel.id
                        == OntologyVersionOutputCategoryModel.ontology_version_id,
                    )
                    .where(OntologyVersionModel.status == "published")
                )
            )
            .scalars()
            .all()
        )
        result = [map_category(model) for model in models]
        for entity in result:
            entity.locked = entity.id in locked
        return result

    async def get_by_key(self, ontology_id: str, key: str) -> CategoryEntity | None:
        model = (
            await self._session.execute(
                select(CategoryModel).where(
                    CategoryModel.ontology_id == ontology_id,
                    CategoryModel.key == key,
                )
            )
        ).scalar_one_or_none()
        return map_category(model) if model else None

    async def update(self, entity: CategoryEntity) -> CategoryEntity:
        model = await self._session.get(CategoryModel, entity.id)
        assert model is not None
        model.key, model.name, model.color, model.description = (
            entity.key,
            entity.name,
            entity.color,
            entity.description,
        )
        await self._session.flush()
        return await self.get(entity.id)  # type: ignore[return-value]

    async def delete(self, entity_id: str) -> bool:
        draft_versions = select(OntologyVersionModel.id).where(
            OntologyVersionModel.status == "draft"
        )
        await self._session.execute(
            delete(OntologyVersionOutputCategoryModel).where(
                OntologyVersionOutputCategoryModel.category_id == entity_id,
                OntologyVersionOutputCategoryModel.ontology_version_id.in_(
                    draft_versions
                ),
            )
        )
        result = await self._session.execute(
            delete(CategoryModel).where(CategoryModel.id == entity_id)
        )
        await self._session.flush()
        return bool(getattr(result, "rowcount", 0))

    async def is_locked(self, entity_id: str) -> bool:
        return bool(
            await self._session.scalar(
                select(
                    exists().where(
                        OntologyVersionOutputCategoryModel.category_id == entity_id,
                        OntologyVersionOutputCategoryModel.ontology_version_id
                        == OntologyVersionModel.id,
                        OntologyVersionModel.status == "published",
                    )
                )
            )
        )
