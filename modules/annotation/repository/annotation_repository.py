from collections.abc import Sequence
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.utils.id_generator import generate_ulid
from modules.annotation.domain.entities import (
    AnnotationEntity,
    AnnotationRevisionEntity,
)
from modules.annotation.domain.interfaces import IAnnotationRepository
from modules.annotation.models.annotation import (
    AnnotationModel,
    AnnotationRevisionModel,
)


class SqlAnnotationRepository(IAnnotationRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save_annotation(self, annotation: AnnotationEntity) -> AnnotationEntity:
        stmt = select(AnnotationModel).where(AnnotationModel.id == annotation.id)
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            existing.target_type = annotation.target_type
            existing.target_selector = annotation.target_selector
            existing.ontology_version_id = annotation.ontology_version_id
            await self.session.flush()
            await self.session.refresh(existing)
            return existing.to_entity()

        model = AnnotationModel(
            id=annotation.id,
            asset_id=annotation.asset_id,
            project_id=annotation.project_id,
            target_type=annotation.target_type,
            target_selector=annotation.target_selector,
            ontology_version_id=annotation.ontology_version_id,
            created_by=annotation.created_by,
        )
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return model.to_entity()

    async def get_annotation_by_id(self, annotation_id: str) -> AnnotationEntity | None:
        stmt = (
            select(AnnotationModel)
            .options(selectinload(AnnotationModel.revisions))
            .where(AnnotationModel.id == annotation_id)
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return model.to_entity() if model else None

    async def get_annotation_by_target(
        self,
        asset_id: str,
        target_type: str,
        target_selector: dict[str, Any],
    ) -> AnnotationEntity | None:
        stmt = (
            select(AnnotationModel)
            .options(selectinload(AnnotationModel.revisions))
            .where(
                AnnotationModel.asset_id == asset_id,
                AnnotationModel.target_type == target_type,
                AnnotationModel.target_selector == target_selector,
            )
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return model.to_entity() if model else None

    async def list_annotations_by_asset(
        self, asset_id: str, target_type: str | None = None
    ) -> Sequence[AnnotationEntity]:
        query = (
            select(AnnotationModel)
            .options(selectinload(AnnotationModel.revisions))
            .where(AnnotationModel.asset_id == asset_id)
        )
        if target_type:
            query = query.where(AnnotationModel.target_type == target_type)
        query = query.order_by(AnnotationModel.created_at.desc())

        res = await self.session.execute(query)
        models = res.scalars().all()
        return [m.to_entity() for m in models]

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
            ontology_version_id=revision.ontology_version_id,
            created_by=revision.created_by,
            source=revision.source,
            results=revision.results,
            category_ids=revision.category_ids,
        )
        self.session.add(rev_model)
        await self.session.flush()
        await self.session.refresh(rev_model)

        return rev_model.to_entity()

    async def get_revision_by_id(
        self, revision_id: str
    ) -> AnnotationRevisionEntity | None:
        stmt = select(AnnotationRevisionModel).where(
            AnnotationRevisionModel.id == revision_id
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return model.to_entity() if model else None

    async def list_revisions_by_annotation(
        self, annotation_id: str
    ) -> Sequence[AnnotationRevisionEntity]:
        stmt = (
            select(AnnotationRevisionModel)
            .where(AnnotationRevisionModel.annotation_id == annotation_id)
            .order_by(AnnotationRevisionModel.revision_number.desc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [m.to_entity() for m in models]

    async def get_latest_revision(
        self, annotation_id: str
    ) -> AnnotationRevisionEntity | None:
        stmt = (
            select(AnnotationRevisionModel)
            .where(AnnotationRevisionModel.annotation_id == annotation_id)
            .order_by(AnnotationRevisionModel.revision_number.desc())
            .limit(1)
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return model.to_entity() if model else None
