from modules.snapshot.domain.exceptions import SnapshotNotFoundError
from modules.snapshot.domain.interfaces import (
    SnapshotManifestRepository,
    SnapshotRepository,
    StorageGateway,
)


class PurgeSnapshotUseCase:
    def __init__(
        self,
        snapshot_repo: SnapshotRepository,
        manifest_repo: SnapshotManifestRepository,
        storage_gateway: StorageGateway,
    ) -> None:
        self._snapshot_repo = snapshot_repo
        self._manifest_repo = manifest_repo
        self._storage_gateway = storage_gateway

    async def execute(
        self,
        project_id: str,
        snapshot_id: str,
    ) -> bool:
        snapshot = await self._snapshot_repo.get_by_id(snapshot_id)
        if not snapshot or snapshot.project_id != project_id:
            raise SnapshotNotFoundError(
                f"Snapshot '{snapshot_id}' does not exist in project '{project_id}'."
            )

        # 1. Check if manifest exists and purge object from S3
        manifest = await self._manifest_repo.get_by_snapshot_id(snapshot_id)
        if manifest and manifest.storage_uri:
            await self._storage_gateway.delete_object(manifest.storage_uri)

        # 2. Hard delete snapshot record (cascade deletes items and manifest in DB)
        return await self._snapshot_repo.delete_permanent(snapshot_id)
