from collections.abc import Sequence

from core.utils.id_generator import generate_ulid
from modules.snapshot.domain.entities import ReleaseTagEntity
from modules.snapshot.domain.exceptions import SnapshotNotFoundError
from modules.snapshot.domain.interfaces import (
    ReleaseTagRepository,
    SnapshotRepository,
)
from modules.snapshot.domain.value_objects import SnapshotStatus


class ManageReleaseTagsUseCase:
    def __init__(
        self,
        snapshot_repo: SnapshotRepository,
        tag_repo: ReleaseTagRepository,
    ) -> None:
        self._snapshot_repo = snapshot_repo
        self._tag_repo = tag_repo

    async def assign_tag(
        self,
        project_id: str,
        snapshot_id: str,
        name: str,
        user_id: int,
    ) -> ReleaseTagEntity:
        snapshot = await self._snapshot_repo.get_by_id(snapshot_id)
        if not snapshot or snapshot.project_id != project_id:
            raise SnapshotNotFoundError(
                f"Snapshot '{snapshot_id}' does not exist in project '{project_id}'."
            )

        if snapshot.status != SnapshotStatus.READY:
            raise ValueError(
                f"Cannot assign release tag to snapshot in '{snapshot.status.value}' status. "
                "Only 'READY' snapshots can be tagged for release."
            )

        clean_name = name.strip()
        if not clean_name:
            raise ValueError("Tag name cannot be empty.")

        tag_entity = ReleaseTagEntity(
            id=generate_ulid(),
            project_id=project_id,
            snapshot_id=snapshot_id,
            name=clean_name,
            created_by=user_id,
        )
        return await self._tag_repo.upsert(tag_entity)

    async def list_tags(self, project_id: str) -> Sequence[ReleaseTagEntity]:
        return await self._tag_repo.list_by_project(project_id)

    async def delete_tag(self, project_id: str, name: str) -> bool:
        clean_name = name.strip()
        deleted = await self._tag_repo.delete(project_id, clean_name)
        if not deleted:
            raise SnapshotNotFoundError(
                f"Release tag '{clean_name}' does not exist in project '{project_id}'."
            )
        return True
