from modules.snapshot.domain.entities import SnapshotEntity
from modules.snapshot.domain.exceptions import SnapshotNotFoundError
from modules.snapshot.domain.interfaces import SnapshotRepository


class GetSnapshotDetailUseCase:
    def __init__(self, snapshot_repo: SnapshotRepository) -> None:
        self._snapshot_repo = snapshot_repo

    async def execute(self, project_id: str, snapshot_id: str) -> SnapshotEntity:
        snapshot = await self._snapshot_repo.get_by_id(snapshot_id)
        if not snapshot or snapshot.project_id != project_id:
            raise SnapshotNotFoundError(
                f"Snapshot '{snapshot_id}' does not exist in project '{project_id}'."
            )
        return snapshot
