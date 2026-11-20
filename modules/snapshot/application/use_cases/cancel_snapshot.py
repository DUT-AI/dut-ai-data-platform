from modules.snapshot.domain.entities import SnapshotEntity
from modules.snapshot.domain.exceptions import SnapshotNotFoundError
from modules.snapshot.domain.interfaces import SnapshotRepository
from modules.snapshot.domain.value_objects import SnapshotStatus
from modules.snapshot.infrastructure.background.snapshot_worker import (
    request_snapshot_cancellation,
)


class CancelSnapshotUseCase:
    def __init__(self, snapshot_repo: SnapshotRepository) -> None:
        self._snapshot_repo = snapshot_repo

    async def execute(
        self,
        project_id: str,
        snapshot_id: str,
        user_id: int,
    ) -> SnapshotEntity:
        snapshot = await self._snapshot_repo.get_by_id(snapshot_id)
        if not snapshot or snapshot.project_id != project_id:
            raise SnapshotNotFoundError(
                f"Snapshot '{snapshot_id}' does not exist in project '{project_id}'."
            )

        if snapshot.status != SnapshotStatus.CREATING:
            raise ValueError(
                f"Cannot cancel snapshot with status '{snapshot.status.value}'. Only 'CREATING' snapshots can be cancelled."
            )

        # Signal cancellation to worker
        request_snapshot_cancellation(snapshot_id)

        # Eagerly mark failed in database
        snapshot.mark_failed(
            error_code="cancelled_by_user",
            error_message=f"Snapshot creation cancelled by user {user_id}.",
        )
        return await self._snapshot_repo.update(snapshot)
