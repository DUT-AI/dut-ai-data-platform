from collections.abc import Sequence

from sqlalchemy import delete, exists, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from modules.ontology.domain.entities import OntologyInputEntity
from modules.ontology.domain.interfaces import IOntologyInputRepository
from modules.ontology.models import (
    OntologyInputModel,
    OntologyVersionInputModel,
    OntologyVersionModel,
    OntologyVersionOutputCategoryModel,
    OntologyVersionOutputModel,
)
from modules.ontology.repository._mappers import map_input


class SqlOntologyInputRepository(IOntologyInputRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, entity: OntologyInputEntity) -> OntologyInputEntity:
        model = OntologyInputModel(
            id=entity.id,
            ontology_id=entity.ontology_id,
            definition_id=entity.definition_id,
            name=entity.name,
            description=entity.description,
            scope=entity.scope,
            input_schema=entity.input_schema,
        )
        self._session.add(model)
        await self._session.flush()
        return await self.get(model.id)  # type: ignore[return-value]

    async def get(self, entity_id: str) -> OntologyInputEntity | None:
        model = (
            await self._session.execute(
                select(OntologyInputModel)
                .options(selectinload(OntologyInputModel.definition))
                .where(OntologyInputModel.id == entity_id)
            )
        ).scalar_one_or_none()
        if model is None:
            return None
        entity = map_input(model)
        entity.locked = await self.is_locked(entity.id)
        return entity

    async def list_by_ontology(self, ontology_id: str) -> Sequence[OntologyInputEntity]:
        models = (
            (
                await self._session.execute(
                    select(OntologyInputModel)
                    .options(selectinload(OntologyInputModel.definition))
                    .where(OntologyInputModel.ontology_id == ontology_id)
                    .order_by(OntologyInputModel.created_at)
                )
            )
            .scalars()
            .all()
        )
        locked = set(
            (
                await self._session.execute(
                    select(OntologyVersionInputModel.ontology_input_id)
                    .join(
                        OntologyVersionModel,
                        OntologyVersionModel.id
                        == OntologyVersionInputModel.ontology_version_id,
                    )
                    .where(OntologyVersionModel.status == "published")
                )
            )
            .scalars()
            .all()
        )
        result = [map_input(model) for model in models]
        for entity in result:
            entity.locked = entity.id in locked
        return result

    async def update(self, entity: OntologyInputEntity) -> OntologyInputEntity:
        model = await self._session.get(OntologyInputModel, entity.id)
        assert model is not None
        model.name, model.description, model.scope = (
            entity.name,
            entity.description,
            entity.scope,
        )
        model.definition_id = entity.definition_id
        model.input_schema = entity.input_schema
        await self._session.flush()
        return await self.get(entity.id)  # type: ignore[return-value]

    async def delete(self, entity_id: str) -> bool:
        draft_versions = select(OntologyVersionModel.id).where(
            OntologyVersionModel.status == "draft"
        )
        draft_outputs = select(OntologyVersionOutputModel.ontology_output_id).where(
            OntologyVersionOutputModel.ontology_input_id == entity_id,
            OntologyVersionOutputModel.ontology_version_id.in_(draft_versions),
        )
        await self._session.execute(
            delete(OntologyVersionOutputCategoryModel).where(
                OntologyVersionOutputCategoryModel.ontology_version_id.in_(
                    draft_versions
                ),
                OntologyVersionOutputCategoryModel.ontology_output_id.in_(
                    draft_outputs
                ),
            )
        )
        await self._session.execute(
            delete(OntologyVersionOutputModel).where(
                OntologyVersionOutputModel.ontology_input_id == entity_id,
                OntologyVersionOutputModel.ontology_version_id.in_(draft_versions),
            )
        )
        await self._session.execute(
            delete(OntologyVersionInputModel).where(
                OntologyVersionInputModel.ontology_input_id == entity_id,
                OntologyVersionInputModel.ontology_version_id.in_(draft_versions),
            )
        )
        result = await self._session.execute(
            delete(OntologyInputModel).where(OntologyInputModel.id == entity_id)
        )
        await self._session.flush()
        return bool(getattr(result, "rowcount", 0))

    async def is_locked(self, entity_id: str) -> bool:
        return bool(
            await self._session.scalar(
                select(
                    exists().where(
                        OntologyVersionInputModel.ontology_input_id == entity_id,
                        OntologyVersionInputModel.ontology_version_id
                        == OntologyVersionModel.id,
                        OntologyVersionModel.status == "published",
                    )
                )
            )
        )
