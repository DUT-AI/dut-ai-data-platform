from modules.snapshot.domain.entities import SnapshotEntity
from modules.snapshot.domain.exceptions import SnapshotNotFoundError
from modules.snapshot.domain.interfaces import SnapshotRepository
from modules.snapshot.domain.value_objects import SnapshotStatus


class ArchiveSnapshotUseCase:
    def __init__(self, snapshot_repo: SnapshotRepository) -> None:
        self._snapshot_repo = snapshot_repo

    async def execute(
        self,
        project_id: str,
        snapshot_id: str,
    ) -> SnapshotEntity:
        snapshot = await self._snapshot_repo.get_by_id(snapshot_id)
        if not snapshot or snapshot.project_id != project_id:
            raise SnapshotNotFoundError(
                f"Snapshot '{snapshot_id}' does not exist in project '{project_id}'."
            )

        if snapshot.status != SnapshotStatus.READY:
            raise ValueError(
                f"Cannot archive snapshot in status '{snapshot.status.value}'. "
                "Only 'READY' snapshots can be archived."
            )

        snapshot.archive()
        return await self._snapshot_repo.update(snapshot)
