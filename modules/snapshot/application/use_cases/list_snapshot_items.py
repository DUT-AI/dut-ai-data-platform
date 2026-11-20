from collections.abc import Sequence

from modules.snapshot.domain.entities import SnapshotItemEntity
from modules.snapshot.domain.exceptions import SnapshotNotFoundError
from modules.snapshot.domain.interfaces import (
    SnapshotItemRepository,
    SnapshotRepository,
)


class ListSnapshotItemsUseCase:
    def __init__(
        self,
        snapshot_repo: SnapshotRepository,
        snapshot_item_repo: SnapshotItemRepository,
    ) -> None:
        self._snapshot_repo = snapshot_repo
        self._snapshot_item_repo = snapshot_item_repo

    async def execute(
        self,
        project_id: str,
        snapshot_id: str,
        cursor: str | None = None,
        limit: int = 100,
        split: str | None = None,
    ) -> tuple[Sequence[SnapshotItemEntity], str | None, int]:
        snapshot = await self._snapshot_repo.get_by_id(snapshot_id)
        if not snapshot or snapshot.project_id != project_id:
            raise SnapshotNotFoundError(
                f"Snapshot '{snapshot_id}' does not exist in project '{project_id}'."
            )

        items, next_cursor = await self._snapshot_item_repo.list_by_snapshot_keyset(
            snapshot_id=snapshot_id,
            cursor=cursor,
            limit=limit,
            split=split,
        )
        total_count = await self._snapshot_item_repo.count_by_snapshot(
            snapshot_id=snapshot_id, split=split
        )

        return items, next_cursor, total_count
