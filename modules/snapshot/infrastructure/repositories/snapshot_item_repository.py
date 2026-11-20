from collections.abc import Sequence

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from modules.snapshot.domain.entities import SnapshotItemEntity
from modules.snapshot.domain.interfaces import SnapshotItemRepository
from modules.snapshot.infrastructure.persistence.models import SnapshotItemModel


def _to_entity(model: SnapshotItemModel) -> SnapshotItemEntity:
    return SnapshotItemEntity(
        id=model.id,
        snapshot_id=model.snapshot_id,
        asset_id=model.asset_id,
        annotation_revision_id=model.annotation_revision_id,
        split=model.split,
        item_checksum=model.item_checksum,
        sort_order=model.sort_order,
    )


class SqlSnapshotItemRepository(SnapshotItemRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def bulk_create(self, items: Sequence[SnapshotItemEntity]) -> int:
        if not items:
            return 0

        # Batch insert for performance and lower memory footprint
        batch_size = 1000
        total_inserted = 0

        for i in range(0, len(items), batch_size):
            chunk = items[i : i + batch_size]
            dicts = [
                {
                    "id": item.id,
                    "snapshot_id": item.snapshot_id,
                    "asset_id": item.asset_id,
                    "annotation_revision_id": item.annotation_revision_id,
                    "split": item.split,
                    "item_checksum": item.item_checksum,
                    "sort_order": item.sort_order,
                }
                for item in chunk
            ]
            stmt = pg_insert(SnapshotItemModel).values(dicts)
            await self._session.execute(stmt)
            total_inserted += len(chunk)

        await self._session.flush()
        return total_inserted

    async def list_by_snapshot_keyset(
        self,
        snapshot_id: str,
        cursor: str | None = None,
        limit: int = 100,
        split: str | None = None,
    ) -> tuple[Sequence[SnapshotItemEntity], str | None]:
        stmt = (
            select(SnapshotItemModel)
            .where(SnapshotItemModel.snapshot_id == snapshot_id)
            .order_by(SnapshotItemModel.id.asc())
            .limit(limit + 1)
        )
        if cursor:
            stmt = stmt.where(SnapshotItemModel.id > cursor)
        if split:
            stmt = stmt.where(SnapshotItemModel.split == split)

        result = await self._session.execute(stmt)
        models = result.scalars().all()

        next_cursor: str | None = None
        if len(models) > limit:
            next_cursor = models[limit - 1].id
            models = models[:limit]

        return [_to_entity(m) for m in models], next_cursor

    async def list_by_snapshot_offset(
        self,
        snapshot_id: str,
        limit: int = 100,
        offset: int = 0,
        split: str | None = None,
    ) -> Sequence[SnapshotItemEntity]:
        stmt = (
            select(SnapshotItemModel)
            .where(SnapshotItemModel.snapshot_id == snapshot_id)
            .order_by(SnapshotItemModel.sort_order.asc(), SnapshotItemModel.id.asc())
            .limit(limit)
            .offset(offset)
        )
        if split:
            stmt = stmt.where(SnapshotItemModel.split == split)

        result = await self._session.execute(stmt)
        models = result.scalars().all()
        return [_to_entity(m) for m in models]

    async def count_by_snapshot(
        self, snapshot_id: str, split: str | None = None
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(SnapshotItemModel)
            .where(SnapshotItemModel.snapshot_id == snapshot_id)
        )
        if split:
            stmt = stmt.where(SnapshotItemModel.split == split)

        result = await self._session.execute(stmt)
        return result.scalar_one() or 0

    async def delete_by_snapshot(self, snapshot_id: str) -> int:
        stmt = delete(SnapshotItemModel).where(
            SnapshotItemModel.snapshot_id == snapshot_id
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.rowcount or 0
