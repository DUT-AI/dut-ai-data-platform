from collections.abc import Sequence

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.snapshot.domain.entities import SnapshotEntity
from modules.snapshot.domain.interfaces import SnapshotRepository
from modules.snapshot.domain.value_objects import (
    SelectionPolicy,
    SnapshotStatus,
    SplitRatios,
    SplitStrategy,
)
from modules.snapshot.infrastructure.persistence.models import (
    SnapshotModel,
    SnapshotTagModel,
)


def _to_entity(model: SnapshotModel, tags: list[str] | None = None) -> SnapshotEntity:
    ratios = SplitRatios(
        train=float(model.split_ratios.get("train", 0.7)),
        validation=float(model.split_ratios.get("validation", 0.15)),
        test=float(model.split_ratios.get("test", 0.15)),
    )
    tag_names = tags if tags is not None else [t.name for t in (model.tags or [])]
    return SnapshotEntity(
        id=model.id,
        project_id=model.project_id,
        dataset_version_id=model.dataset_version_id,
        ontology_version_id=model.ontology_version_id,
        version_name=model.version_name,
        status=SnapshotStatus(model.status),
        selection_policy=SelectionPolicy(model.selection_policy),
        include_unannotated=model.include_unannotated,
        split_strategy=SplitStrategy(model.split_strategy),
        split_ratios=ratios,
        created_by=model.created_by,
        created_at=model.created_at,
        split_seed=model.split_seed,
        error_code=model.error_code,
        error_message=model.error_message,
        finalized_at=model.finalized_at,
        archived_at=model.archived_at,
        tags=tag_names,
    )


class SqlSnapshotRepository(SnapshotRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, snapshot: SnapshotEntity) -> SnapshotEntity:
        model = SnapshotModel(
            id=snapshot.id,
            project_id=snapshot.project_id,
            dataset_version_id=snapshot.dataset_version_id,
            ontology_version_id=snapshot.ontology_version_id,
            version_name=snapshot.version_name,
            status=snapshot.status.value,
            selection_policy=snapshot.selection_policy.value,
            include_unannotated=snapshot.include_unannotated,
            split_strategy=snapshot.split_strategy.value,
            split_ratios=snapshot.split_ratios.to_dict(),
            split_seed=snapshot.split_seed,
            error_code=snapshot.error_code,
            error_message=snapshot.error_message,
            created_by=snapshot.created_by,
            created_at=snapshot.created_at,
            finalized_at=snapshot.finalized_at,
            archived_at=snapshot.archived_at,
        )
        self._session.add(model)
        await self._session.flush()
        return _to_entity(model, tags=[])

    async def get_by_id(self, snapshot_id: str) -> SnapshotEntity | None:
        stmt = select(SnapshotModel).where(SnapshotModel.id == snapshot_id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            return None

        # Fetch tags
        tag_stmt = select(SnapshotTagModel.name).where(
            SnapshotTagModel.snapshot_id == snapshot_id
        )
        tag_result = await self._session.execute(tag_stmt)
        tags = [row[0] for row in tag_result.all()]
        return _to_entity(model, tags=tags)

    async def get_by_project_and_version(
        self, project_id: str, version_name: str
    ) -> SnapshotEntity | None:
        stmt = select(SnapshotModel).where(
            SnapshotModel.project_id == project_id,
            SnapshotModel.version_name == version_name,
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            return None

        tag_stmt = select(SnapshotTagModel.name).where(
            SnapshotTagModel.snapshot_id == model.id
        )
        tag_result = await self._session.execute(tag_stmt)
        tags = [row[0] for row in tag_result.all()]
        return _to_entity(model, tags=tags)

    async def list_by_project(
        self,
        project_id: str,
        status: SnapshotStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[SnapshotEntity]:
        stmt = select(SnapshotModel).where(SnapshotModel.project_id == project_id)
        if status is not None:
            stmt = stmt.where(SnapshotModel.status == status.value)
        stmt = stmt.order_by(SnapshotModel.created_at.desc()).limit(limit).offset(offset)
        result = await self._session.execute(stmt)
        models = result.scalars().all()

        entities: list[SnapshotEntity] = []
        for m in models:
            tag_stmt = select(SnapshotTagModel.name).where(
                SnapshotTagModel.snapshot_id == m.id
            )
            tag_result = await self._session.execute(tag_stmt)
            tags = [row[0] for row in tag_result.all()]
            entities.append(_to_entity(m, tags=tags))
        return entities

    async def update(self, snapshot: SnapshotEntity) -> SnapshotEntity:
        stmt = select(SnapshotModel).where(SnapshotModel.id == snapshot.id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            raise ValueError(f"Snapshot with id {snapshot.id} not found")

        model.status = snapshot.status.value
        model.error_code = snapshot.error_code
        model.error_message = snapshot.error_message
        model.finalized_at = snapshot.finalized_at
        model.archived_at = snapshot.archived_at
        await self._session.flush()
        return _to_entity(model, tags=snapshot.tags)

    async def delete_permanent(self, snapshot_id: str) -> bool:
        stmt = delete(SnapshotModel).where(SnapshotModel.id == snapshot_id)
        result = await self._session.execute(stmt)
        await self._session.flush()
        return (result.rowcount or 0) > 0

    async def count_by_project(self, project_id: str) -> int:
        stmt = (
            select(func.count())
            .select_from(SnapshotModel)
            .where(SnapshotModel.project_id == project_id)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one() or 0
