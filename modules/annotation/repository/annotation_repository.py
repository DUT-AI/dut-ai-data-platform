from collections.abc import Sequence

from sqlalchemy import inspect, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.utils.id_generator import generate_ulid
from modules.annotation.domain.entities import (
    AnnotationEntity,
    AnnotationResultEntity,
    AnnotationRevisionEntity,
)
from modules.annotation.domain.interfaces import IAnnotationRepository
from modules.annotation.models.annotation import (
    AnnotationModel,
    AnnotationResultModel,
    AnnotationRevisionModel,
)


def _map_result_to_entity(
    model: AnnotationResultModel,
) -> AnnotationResultEntity:
    return AnnotationResultEntity(
        id=model.id,
        revision_id=model.revision_id,
        category_id=model.category_id,
        result_type=model.result_type,  # type: ignore
        geometry=model.geometry,
        payload=model.payload,
        attributes=model.attributes,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def _map_revision_to_entity(
    model: AnnotationRevisionModel,
) -> AnnotationRevisionEntity:
    unloaded = inspect(model).unloaded
    results = (
        [_map_result_to_entity(r) for r in model.results]
        if "results" not in unloaded and model.results
        else []
    )
    return AnnotationRevisionEntity(
        id=model.id,
        annotation_id=model.annotation_id,
        revision_number=model.revision_number,
        created_by=model.created_by,
        source=model.source,  # type: ignore
        created_at=model.created_at,
        updated_at=model.updated_at,
        results=results,
    )


def _map_annotation_to_entity(model: AnnotationModel) -> AnnotationEntity:
    unloaded = inspect(model).unloaded
    revs = (
        [_map_revision_to_entity(r) for r in model.revisions]
        if "revisions" not in unloaded and model.revisions
        else []
    )
    return AnnotationEntity(
        id=model.id,
        asset_id=model.asset_id,
        project_id=model.project_id,
        ontology_version_id=model.ontology_version_id,
        created_by=model.created_by,
        label_studio_task_id=model.label_studio_task_id,
        created_at=model.created_at,
        updated_at=model.updated_at,
        revisions=revs,
    )


class SqlAnnotationRepository(IAnnotationRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save_annotation(self, annotation: AnnotationEntity) -> AnnotationEntity:
        stmt = select(AnnotationModel).where(AnnotationModel.id == annotation.id)
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            existing.ontology_version_id = annotation.ontology_version_id
            if annotation.label_studio_task_id is not None:
                existing.label_studio_task_id = annotation.label_studio_task_id
            await self.session.flush()
            await self.session.refresh(existing)
            return _map_annotation_to_entity(existing)

        model = AnnotationModel(
            id=annotation.id,
            asset_id=annotation.asset_id,
            project_id=annotation.project_id,
            ontology_version_id=annotation.ontology_version_id,
            created_by=annotation.created_by,
        )
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return _map_annotation_to_entity(model)

    async def get_annotation_by_id(self, annotation_id: str) -> AnnotationEntity | None:
        stmt = (
            select(AnnotationModel)
            .options(
                selectinload(AnnotationModel.revisions).selectinload(
                    AnnotationRevisionModel.results
                )
            )
            .where(AnnotationModel.id == annotation_id)
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return _map_annotation_to_entity(model) if model else None

    async def get_annotation_by_asset_and_ontology(
        self, asset_id: str, ontology_version_id: str
    ) -> AnnotationEntity | None:
        stmt = (
            select(AnnotationModel)
            .options(
                selectinload(AnnotationModel.revisions).selectinload(
                    AnnotationRevisionModel.results
                )
            )
            .where(
                AnnotationModel.asset_id == asset_id,
                AnnotationModel.ontology_version_id == ontology_version_id,
            )
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return _map_annotation_to_entity(model) if model else None

    async def list_annotations_by_asset(
        self, asset_id: str
    ) -> Sequence[AnnotationEntity]:
        stmt = (
            select(AnnotationModel)
            .options(
                selectinload(AnnotationModel.revisions).selectinload(
                    AnnotationRevisionModel.results
                )
            )
            .where(AnnotationModel.asset_id == asset_id)
            .order_by(AnnotationModel.created_at.desc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [_map_annotation_to_entity(m) for m in models]

    async def create_revision(
        self, revision: AnnotationRevisionEntity
    ) -> AnnotationRevisionEntity:
        count_stmt = select(AnnotationRevisionModel).where(
            AnnotationRevisionModel.annotation_id == revision.annotation_id
        )
        res = await self.session.execute(count_stmt)
        existing_revs = res.scalars().all()
        next_rev_num = (
            max([r.revision_number for r in existing_revs], default=0) + 1
            if existing_revs
            else revision.revision_number or 1
        )

        rev_model = AnnotationRevisionModel(
            id=revision.id or generate_ulid(),
            annotation_id=revision.annotation_id,
            revision_number=next_rev_num,
            created_by=revision.created_by,
            source=revision.source,
        )
        self.session.add(rev_model)
        await self.session.flush()

        for res_entity in revision.results:
            result_model = AnnotationResultModel(
                id=res_entity.id or generate_ulid(),
                revision_id=rev_model.id,
                category_id=res_entity.category_id,
                result_type=res_entity.result_type,
                geometry=res_entity.geometry,
                payload=res_entity.payload,
                attributes=res_entity.attributes,
            )
            self.session.add(result_model)

        await self.session.flush()
        return await self.get_revision_by_id(rev_model.id)  # type: ignore

    async def get_revision_by_id(
        self, revision_id: str
    ) -> AnnotationRevisionEntity | None:
        stmt = (
            select(AnnotationRevisionModel)
            .options(selectinload(AnnotationRevisionModel.results))
            .where(AnnotationRevisionModel.id == revision_id)
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return _map_revision_to_entity(model) if model else None

    async def list_revisions_by_annotation(
        self, annotation_id: str
    ) -> Sequence[AnnotationRevisionEntity]:
        stmt = (
            select(AnnotationRevisionModel)
            .options(selectinload(AnnotationRevisionModel.results))
            .where(AnnotationRevisionModel.annotation_id == annotation_id)
            .order_by(AnnotationRevisionModel.revision_number.desc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [_map_revision_to_entity(m) for m in models]

    async def get_latest_revision(
        self, annotation_id: str
    ) -> AnnotationRevisionEntity | None:
        stmt = (
            select(AnnotationRevisionModel)
            .options(selectinload(AnnotationRevisionModel.results))
            .where(AnnotationRevisionModel.annotation_id == annotation_id)
            .order_by(AnnotationRevisionModel.revision_number.desc())
            .limit(1)
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return _map_revision_to_entity(model) if model else None
