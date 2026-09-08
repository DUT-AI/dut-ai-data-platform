from collections.abc import Sequence

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.ontology.domain.entities import (
    OntologyVersionEntity,
    OntologyVersionInputEntity,
    OntologyVersionOutputEntity,
)
from modules.ontology.domain.interfaces import IOntologyVersionRepository
from modules.ontology.models import (
    OntologyModel,
    OntologyVersionInputModel,
    OntologyVersionModel,
    OntologyVersionOutputCategoryModel,
    OntologyVersionOutputModel,
)
from modules.ontology.repository._mappers import map_version, version_load_options


class SqlOntologyVersionRepository(IOntologyVersionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, entity: OntologyVersionEntity) -> OntologyVersionEntity:
        model = OntologyVersionModel(
            id=entity.id,
            ontology_id=entity.ontology_id,
            version_no=entity.version_no,
            name=entity.name,
            status=entity.status,
            based_on_version_id=entity.based_on_version_id,
            schema_hash=entity.schema_hash,
            raw_label_config=entity.raw_label_config,
            published_at=entity.published_at,
        )
        self._session.add(model)
        await self._session.flush()
        if entity.inputs or entity.outputs:
            return await self.replace_composition(
                entity.id, entity.inputs, entity.outputs
            )
        return await self.get(entity.id)  # type: ignore[return-value]

    async def get(self, entity_id: str) -> OntologyVersionEntity | None:
        model = (
            (
                await self._session.execute(
                    select(OntologyVersionModel)
                    .options(*version_load_options())
                    .execution_options(populate_existing=True)
                    .where(OntologyVersionModel.id == entity_id)
                )
            )
            .scalars()
            .unique()
            .one_or_none()
        )
        return map_version(model) if model else None

    async def list_by_ontology(
        self, ontology_id: str
    ) -> Sequence[OntologyVersionEntity]:
        models = (
            (
                await self._session.execute(
                    select(OntologyVersionModel)
                    .options(*version_load_options())
                    .where(OntologyVersionModel.ontology_id == ontology_id)
                    .order_by(OntologyVersionModel.version_no.desc())
                )
            )
            .scalars()
            .unique()
            .all()
        )
        return [map_version(model) for model in models]

    async def update(self, entity: OntologyVersionEntity) -> OntologyVersionEntity:
        model = await self._session.get(OntologyVersionModel, entity.id)
        assert model is not None
        model.name, model.status = entity.name, entity.status
        model.schema_hash, model.raw_label_config = (
            entity.schema_hash,
            entity.raw_label_config,
        )
        model.published_at = entity.published_at
        await self._session.flush()
        return await self.get(entity.id)  # type: ignore[return-value]

    async def replace_composition(
        self,
        version_id: str,
        inputs: Sequence[OntologyVersionInputEntity],
        outputs: Sequence[OntologyVersionOutputEntity],
    ) -> OntologyVersionEntity:
        await self._session.execute(
            delete(OntologyVersionOutputModel).where(
                OntologyVersionOutputModel.ontology_version_id == version_id
            )
        )
        await self._session.execute(
            delete(OntologyVersionInputModel).where(
                OntologyVersionInputModel.ontology_version_id == version_id
            )
        )
        self._session.add_all(
            [
                OntologyVersionInputModel(
                    ontology_version_id=version_id,
                    ontology_input_id=item.ontology_input_id,
                    sort_order=item.sort_order,
                )
                for item in inputs
            ]
        )
        for item in outputs:
            output_model = OntologyVersionOutputModel(
                ontology_version_id=version_id,
                ontology_output_id=item.ontology_output_id,
                ontology_input_id=item.ontology_input_id,
                sort_order=item.sort_order,
            )
            output_model.category_links = [
                OntologyVersionOutputCategoryModel(
                    ontology_version_id=version_id,
                    ontology_output_id=item.ontology_output_id,
                    category_id=category.category_id,
                    sort_order=category.sort_order,
                )
                for category in item.categories
            ]
            self._session.add(output_model)
        await self._session.flush()
        return await self.get(version_id)  # type: ignore[return-value]

    async def delete(self, entity_id: str) -> bool:
        result = await self._session.execute(
            delete(OntologyVersionModel).where(OntologyVersionModel.id == entity_id)
        )
        await self._session.flush()
        return bool(getattr(result, "rowcount", 0))

    async def next_version_no(self, ontology_id: str) -> int:
        await self._session.execute(
            select(OntologyModel.id)
            .where(OntologyModel.id == ontology_id)
            .with_for_update()
        )
        value = await self._session.scalar(
            select(func.max(OntologyVersionModel.version_no)).where(
                OntologyVersionModel.ontology_id == ontology_id
            )
        )
        return int(value or 0) + 1

    async def get_draft(self, ontology_id: str) -> OntologyVersionEntity | None:
        model = (
            (
                await self._session.execute(
                    select(OntologyVersionModel)
                    .options(*version_load_options())
                    .where(
                        OntologyVersionModel.ontology_id == ontology_id,
                        OntologyVersionModel.status == "draft",
                    )
                    .order_by(OntologyVersionModel.version_no.desc())
                )
            )
            .scalars()
            .unique()
            .first()
        )
        return map_version(model) if model else None
