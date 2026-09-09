from collections.abc import Sequence

from sqlalchemy import delete, exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.ontology.domain.entities import InputDefinitionEntity
from modules.ontology.domain.interfaces import IInputDefinitionRepository
from modules.ontology.models import InputDefinitionModel, OntologyInputModel
from modules.ontology.repository._mappers import map_input_definition


class SqlInputDefinitionRepository(IInputDefinitionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, entity: InputDefinitionEntity) -> InputDefinitionEntity:
        model = InputDefinitionModel(
            id=entity.id,
            code=entity.code,
            name=entity.name,
            description=entity.description,
            allowed_formats=entity.allowed_formats,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return map_input_definition(model)

    async def get(self, entity_id: str) -> InputDefinitionEntity | None:
        model = await self._session.get(InputDefinitionModel, entity_id)
        return map_input_definition(model) if model else None

    async def list(self) -> Sequence[InputDefinitionEntity]:
        models = (
            (
                await self._session.execute(
                    select(InputDefinitionModel).order_by(InputDefinitionModel.name)
                )
            )
            .scalars()
            .all()
        )
        return [map_input_definition(model) for model in models]

    async def update(self, entity: InputDefinitionEntity) -> InputDefinitionEntity:
        model = await self._session.get(InputDefinitionModel, entity.id)
        assert model is not None
        model.name, model.description, model.allowed_formats = (
            entity.name,
            entity.description,
            entity.allowed_formats,
        )
        await self._session.flush()
        await self._session.refresh(model)
        return map_input_definition(model)

    async def delete(self, entity_id: str) -> bool:
        result = await self._session.execute(
            delete(InputDefinitionModel).where(InputDefinitionModel.id == entity_id)
        )
        await self._session.flush()
        return bool(getattr(result, "rowcount", 0))

    async def is_used(self, entity_id: str) -> bool:
        return bool(
            await self._session.scalar(
                select(exists().where(OntologyInputModel.definition_id == entity_id))
            )
        )
