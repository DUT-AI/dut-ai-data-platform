from modules.export.domain.exceptions import ExportPackageNotFoundError
from modules.export.domain.interfaces import (
    IExportPackageRepository,
    IStorageGateway,
)


class DeleteExportPackageUseCase:
    """Use case to purge export archive from storage and delete package records."""

    def __init__(
        self,
        package_repo: IExportPackageRepository,
        storage_gateway: IStorageGateway,
    ) -> None:
        self._package_repo = package_repo
        self._storage_gateway = storage_gateway

    async def execute(self, project_id: str, package_id: str) -> bool:
        package = await self._package_repo.get_by_id(package_id)
        if not package or package.project_id != project_id:
            raise ExportPackageNotFoundError(
                f"Export package '{package_id}' not found in project '{project_id}'."
            )

        # 1. Purge archive from storage if present
        if package.storage_uri:
            await self._storage_gateway.delete_package(package.storage_uri)

        # 2. Delete database records (cascading to export_items)
        return await self._package_repo.delete(package_id)
