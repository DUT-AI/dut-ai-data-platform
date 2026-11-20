from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.snapshot.domain.entities import ReleaseTagEntity
from modules.snapshot.domain.interfaces import ReleaseTagRepository
from modules.snapshot.infrastructure.persistence.models import SnapshotTagModel


def _to_entity(model: SnapshotTagModel) -> ReleaseTagEntity:
    return ReleaseTagEntity(
        id=model.id,
        project_id=model.project_id,
        snapshot_id=model.snapshot_id,
        name=model.name,
        created_by=model.created_by,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


class SqlReleaseTagRepository(ReleaseTagRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def upsert(self, tag: ReleaseTagEntity) -> ReleaseTagEntity:
        stmt = select(SnapshotTagModel).where(
            SnapshotTagModel.project_id == tag.project_id,
            SnapshotTagModel.name == tag.name,
        )
        result = await self._session.execute(stmt)
        existing = result.scalar_one_or_none()

        now = datetime.now(UTC)
        if existing:
            existing.snapshot_id = tag.snapshot_id
            existing.updated_at = now
            await self._session.flush()
            return _to_entity(existing)
        else:
            model = SnapshotTagModel(
                id=tag.id,
                project_id=tag.project_id,
                snapshot_id=tag.snapshot_id,
                name=tag.name,
                created_by=tag.created_by,
                created_at=now,
                updated_at=now,
            )
            self._session.add(model)
            await self._session.flush()
            return _to_entity(model)

    async def get_by_project_and_name(
        self, project_id: str, name: str
    ) -> ReleaseTagEntity | None:
        stmt = select(SnapshotTagModel).where(
            SnapshotTagModel.project_id == project_id,
            SnapshotTagModel.name == name,
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return _to_entity(model) if model else None

    async def list_by_project(self, project_id: str) -> Sequence[ReleaseTagEntity]:
        stmt = (
            select(SnapshotTagModel)
            .where(SnapshotTagModel.project_id == project_id)
            .order_by(SnapshotTagModel.name.asc())
        )
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        return [_to_entity(m) for m in models]

    async def delete(self, project_id: str, name: str) -> bool:
        stmt = delete(SnapshotTagModel).where(
            SnapshotTagModel.project_id == project_id,
            SnapshotTagModel.name == name,
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return (result.rowcount or 0) > 0
