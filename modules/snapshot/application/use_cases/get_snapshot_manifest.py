from modules.snapshot.domain.entities import SnapshotManifestEntity
from modules.snapshot.domain.exceptions import SnapshotNotFoundError
from modules.snapshot.domain.interfaces import (
    SnapshotManifestRepository,
    SnapshotRepository,
)
from modules.snapshot.domain.value_objects import SnapshotStatus


class GetSnapshotManifestUseCase:
    def __init__(
        self,
        snapshot_repo: SnapshotRepository,
        manifest_repo: SnapshotManifestRepository,
    ) -> None:
        self._snapshot_repo = snapshot_repo
        self._manifest_repo = manifest_repo

    async def execute(
        self, project_id: str, snapshot_id: str
    ) -> SnapshotManifestEntity:
        snapshot = await self._snapshot_repo.get_by_id(snapshot_id)
        if not snapshot or snapshot.project_id != project_id:
            raise SnapshotNotFoundError(
                f"Snapshot '{snapshot_id}' does not exist in project '{project_id}'."
            )

        if snapshot.status != SnapshotStatus.READY:
            raise ValueError(
                f"Cannot retrieve manifest for snapshot in '{snapshot.status.value}' status. "
                "Manifest is only available once snapshot reaches 'READY' status."
            )

        manifest = await self._manifest_repo.get_by_snapshot_id(snapshot_id)
        if not manifest:
            raise SnapshotNotFoundError(
                f"Manifest for snapshot '{snapshot_id}' not found."
            )

        return manifest
