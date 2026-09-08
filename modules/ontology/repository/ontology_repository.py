from collections.abc import Sequence

from sqlalchemy import delete, exists, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from modules.ontology.domain.entities import OntologyEntity, OntologyVersionEntity
from modules.ontology.domain.interfaces import IOntologyRepository
from modules.ontology.models import OntologyModel, OntologyVersionModel
from modules.ontology.repository._mappers import (
    map_ontology,
    map_version,
    version_load_options,
)


class SqlOntologyRepository(IOntologyRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, entity: OntologyEntity) -> OntologyEntity:
        model = OntologyModel(
            id=entity.id,
            project_id=entity.project_id,
            name=entity.name,
            description=entity.description,
            current_version_id=entity.current_version_id,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return OntologyEntity(
            id=model.id,
            project_id=model.project_id,
            name=model.name,
            description=model.description,
            current_version_id=model.current_version_id,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    async def get(self, entity_id: str) -> OntologyEntity | None:
        model = (
            (
                await self._session.execute(
                    select(OntologyModel)
                    .options(
                        selectinload(OntologyModel.versions).options(
                            *version_load_options()
                        )
                    )
                    .where(OntologyModel.id == entity_id)
                )
            )
            .scalars()
            .unique()
            .one_or_none()
        )
        return map_ontology(model) if model else None

    async def list_by_project(self, project_id: str) -> Sequence[OntologyEntity]:
        models = (
            (
                await self._session.execute(
                    select(OntologyModel)
                    .options(
                        selectinload(OntologyModel.versions).options(
                            *version_load_options()
                        )
                    )
                    .where(OntologyModel.project_id == project_id)
                    .order_by(OntologyModel.created_at.desc())
                )
            )
            .scalars()
            .unique()
            .all()
        )
        return [map_ontology(model) for model in models]

    async def update(self, entity: OntologyEntity) -> OntologyEntity:
        model = (
            await self._session.execute(
                select(OntologyModel).where(OntologyModel.id == entity.id)
            )
        ).scalar_one()
        model.name = entity.name
        model.description = entity.description
        model.current_version_id = entity.current_version_id
        await self._session.flush()
        result = await self.get(entity.id)
        assert result is not None
        return result

    async def delete(self, entity_id: str) -> bool:
        result = await self._session.execute(
            delete(OntologyModel).where(OntologyModel.id == entity_id)
        )
        await self._session.flush()
        return bool(getattr(result, "rowcount", 0))

    async def has_published_version(self, entity_id: str) -> bool:
        return bool(
            await self._session.scalar(
                select(
                    exists().where(
                        OntologyVersionModel.ontology_id == entity_id,
                        OntologyVersionModel.status == "published",
                    )
                )
            )
        )

    async def get_version_by_id(self, version_id: str) -> OntologyVersionEntity | None:
        model = (
            (
                await self._session.execute(
                    select(OntologyVersionModel)
                    .options(*version_load_options())
                    .where(OntologyVersionModel.id == version_id)
                )
            )
            .scalars()
            .unique()
            .one_or_none()
        )
        return map_version(model) if model else None
