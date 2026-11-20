from collections.abc import Sequence

from modules.export.domain.entities import ExportPackageEntity
from modules.export.domain.interfaces import IExportPackageRepository
from modules.export.domain.value_objects import ExportStatus


class ListExportPackagesUseCase:
    """Use case to list export packages for a project with optional filters."""

    def __init__(self, package_repo: IExportPackageRepository) -> None:
        self._package_repo = package_repo

    async def execute(
        self,
        project_id: str,
        snapshot_id: str | None = None,
        status: ExportStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[Sequence[ExportPackageEntity], int]:
        return await self._package_repo.list_by_project(
            project_id=project_id,
            snapshot_id=snapshot_id,
            status=status,
            limit=limit,
            offset=offset,
        )
