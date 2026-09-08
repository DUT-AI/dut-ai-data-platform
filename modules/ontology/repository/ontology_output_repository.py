from collections.abc import Sequence

from sqlalchemy import delete, exists, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from modules.ontology.domain.entities import OntologyOutputEntity
from modules.ontology.domain.interfaces import IOntologyOutputRepository
from modules.ontology.models import (
    OntologyOutputModel,
    OntologyVersionModel,
    OntologyVersionOutputCategoryModel,
    OntologyVersionOutputModel,
)
from modules.ontology.repository._mappers import map_output


class SqlOntologyOutputRepository(IOntologyOutputRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, entity: OntologyOutputEntity) -> OntologyOutputEntity:
        model = OntologyOutputModel(
            id=entity.id,
            ontology_id=entity.ontology_id,
            definition_id=entity.definition_id,
            name=entity.name,
            description=entity.description,
            multiple=entity.multiple,
            required=entity.required,
            value_schema=entity.value_schema,
        )
        self._session.add(model)
        await self._session.flush()
        return await self.get(model.id)  # type: ignore[return-value]

    async def get(self, entity_id: str) -> OntologyOutputEntity | None:
        model = (
            await self._session.execute(
                select(OntologyOutputModel)
                .options(selectinload(OntologyOutputModel.definition))
                .where(OntologyOutputModel.id == entity_id)
            )
        ).scalar_one_or_none()
        if model is None:
            return None
        entity = map_output(model)
        entity.locked = await self.is_locked(entity.id)
        return entity

    async def list_by_ontology(
        self, ontology_id: str
    ) -> Sequence[OntologyOutputEntity]:
        models = (
            (
                await self._session.execute(
                    select(OntologyOutputModel)
                    .options(selectinload(OntologyOutputModel.definition))
                    .where(OntologyOutputModel.ontology_id == ontology_id)
                    .order_by(OntologyOutputModel.created_at)
                )
            )
            .scalars()
            .all()
        )
        locked = set(
            (
                await self._session.execute(
                    select(OntologyVersionOutputModel.ontology_output_id)
                    .join(
                        OntologyVersionModel,
                        OntologyVersionModel.id
                        == OntologyVersionOutputModel.ontology_version_id,
                    )
                    .where(OntologyVersionModel.status == "published")
                )
            )
            .scalars()
            .all()
        )
        result = [map_output(model) for model in models]
        for entity in result:
            entity.locked = entity.id in locked
        return result

    async def update(self, entity: OntologyOutputEntity) -> OntologyOutputEntity:
        model = await self._session.get(OntologyOutputModel, entity.id)
        assert model is not None
        model.name, model.description = entity.name, entity.description
        model.definition_id = entity.definition_id
        model.multiple, model.required, model.value_schema = (
            entity.multiple,
            entity.required,
            entity.value_schema,
        )
        await self._session.flush()
        return await self.get(entity.id)  # type: ignore[return-value]

    async def delete(self, entity_id: str) -> bool:
        draft_versions = select(OntologyVersionModel.id).where(
            OntologyVersionModel.status == "draft"
        )
        await self._session.execute(
            delete(OntologyVersionOutputCategoryModel).where(
                OntologyVersionOutputCategoryModel.ontology_output_id == entity_id,
                OntologyVersionOutputCategoryModel.ontology_version_id.in_(
                    draft_versions
                ),
            )
        )
        await self._session.execute(
            delete(OntologyVersionOutputModel).where(
                OntologyVersionOutputModel.ontology_output_id == entity_id,
                OntologyVersionOutputModel.ontology_version_id.in_(draft_versions),
            )
        )
        result = await self._session.execute(
            delete(OntologyOutputModel).where(OntologyOutputModel.id == entity_id)
        )
        await self._session.flush()
        return bool(getattr(result, "rowcount", 0))

    async def is_locked(self, entity_id: str) -> bool:
        return bool(
            await self._session.scalar(
                select(
                    exists().where(
                        OntologyVersionOutputModel.ontology_output_id == entity_id,
                        OntologyVersionOutputModel.ontology_version_id
                        == OntologyVersionModel.id,
                        OntologyVersionModel.status == "published",
                    )
                )
            )
        )
