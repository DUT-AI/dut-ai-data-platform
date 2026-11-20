from collections.abc import Sequence
from typing import Any

from modules.snapshot.domain.exceptions import SnapshotNotFoundError
from modules.snapshot.domain.interfaces import (
    SnapshotDiffService,
    SnapshotRepository,
)
from modules.snapshot.domain.value_objects import SnapshotStatus


class DiffSnapshotsUseCase:
    def __init__(
        self,
        snapshot_repo: SnapshotRepository,
        diff_service: SnapshotDiffService,
    ) -> None:
        self._snapshot_repo = snapshot_repo
        self._diff_service = diff_service

    async def _validate_snapshots(
        self, project_id: str, base_snapshot_id: str, target_snapshot_id: str
    ) -> None:
        base = await self._snapshot_repo.get_by_id(base_snapshot_id)
        if not base or base.project_id != project_id:
            raise SnapshotNotFoundError(
                f"Base snapshot '{base_snapshot_id}' not found in project '{project_id}'."
            )

        target = await self._snapshot_repo.get_by_id(target_snapshot_id)
        if not target or target.project_id != project_id:
            raise SnapshotNotFoundError(
                f"Target snapshot '{target_snapshot_id}' not found in project '{project_id}'."
            )

        valid_statuses = (SnapshotStatus.READY, SnapshotStatus.ARCHIVED)
        if base.status not in valid_statuses:
            raise ValueError(
                f"Base snapshot '{base_snapshot_id}' is in status '{base.status.value}'. "
                "Diff is only supported for READY or ARCHIVED snapshots."
            )
        if target.status not in valid_statuses:
            raise ValueError(
                f"Target snapshot '{target_snapshot_id}' is in status '{target.status.value}'. "
                "Diff is only supported for READY or ARCHIVED snapshots."
            )

    async def get_summary(
        self, project_id: str, base_snapshot_id: str, target_snapshot_id: str
    ) -> dict[str, Any]:
        await self._validate_snapshots(project_id, base_snapshot_id, target_snapshot_id)
        return await self._diff_service.calculate_diff_summary(
            base_snapshot_id=base_snapshot_id,
            target_snapshot_id=target_snapshot_id,
        )

    async def list_items(
        self,
        project_id: str,
        base_snapshot_id: str,
        target_snapshot_id: str,
        change_type: str,
        cursor: str | None = None,
        limit: int = 100,
    ) -> tuple[Sequence[dict[str, Any]], str | None]:
        await self._validate_snapshots(project_id, base_snapshot_id, target_snapshot_id)
        valid_change_types = ("added", "removed", "modified", "split_changed")
        if change_type not in valid_change_types:
            raise ValueError(
                f"Invalid change_type '{change_type}'. Must be one of: {', '.join(valid_change_types)}."
            )

        return await self._diff_service.list_diff_items(
            base_snapshot_id=base_snapshot_id,
            target_snapshot_id=target_snapshot_id,
            change_type=change_type,
            cursor=cursor,
            limit=limit,
        )
