from collections.abc import Sequence

from sqlalchemy import delete, exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.ontology.domain.entities import OutputDefinitionEntity
from modules.ontology.domain.interfaces import IOutputDefinitionRepository
from modules.ontology.models import OntologyOutputModel, OutputDefinitionModel
from modules.ontology.repository._mappers import map_output_definition


class SqlOutputDefinitionRepository(IOutputDefinitionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, entity: OutputDefinitionEntity) -> OutputDefinitionEntity:
        model = OutputDefinitionModel(
            id=entity.id,
            code=entity.code,
            name=entity.name,
            description=entity.description,
            supports_categories=entity.supports_categories,
            default_schema=entity.default_schema,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return map_output_definition(model)

    async def get(self, entity_id: str) -> OutputDefinitionEntity | None:
        model = await self._session.get(OutputDefinitionModel, entity_id)
        return map_output_definition(model) if model else None

    async def list(self) -> Sequence[OutputDefinitionEntity]:
        models = (
            (
                await self._session.execute(
                    select(OutputDefinitionModel).order_by(OutputDefinitionModel.name)
                )
            )
            .scalars()
            .all()
        )
        return [map_output_definition(model) for model in models]

    async def update(self, entity: OutputDefinitionEntity) -> OutputDefinitionEntity:
        model = await self._session.get(OutputDefinitionModel, entity.id)
        assert model is not None
        model.name, model.description = entity.name, entity.description
        model.supports_categories, model.default_schema = (
            entity.supports_categories,
            entity.default_schema,
        )
        await self._session.flush()
        await self._session.refresh(model)
        return map_output_definition(model)

    async def delete(self, entity_id: str) -> bool:
        result = await self._session.execute(
            delete(OutputDefinitionModel).where(OutputDefinitionModel.id == entity_id)
        )
        await self._session.flush()
        return bool(getattr(result, "rowcount", 0))

    async def is_used(self, entity_id: str) -> bool:
        return bool(
            await self._session.scalar(
                select(exists().where(OntologyOutputModel.definition_id == entity_id))
            )
        )
