from collections.abc import Sequence

from modules.snapshot.domain.entities import SnapshotEntity
from modules.snapshot.domain.interfaces import SnapshotRepository
from modules.snapshot.domain.value_objects import SnapshotStatus


class ListSnapshotsUseCase:
    def __init__(self, snapshot_repo: SnapshotRepository) -> None:
        self._snapshot_repo = snapshot_repo

    async def execute(
        self,
        project_id: str,
        status: SnapshotStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[SnapshotEntity]:
        return await self._snapshot_repo.list_by_project(
            project_id=project_id,
            status=status,
            limit=limit,
            offset=offset,
        )
