from modules.export.domain.exceptions import ExportPackageNotFoundError
from modules.export.domain.interfaces import (
    IExportPackageRepository,
    IStorageGateway,
)
from modules.export.domain.value_objects import ExportStatus


class GetExportDownloadUrlUseCase:
    """Use case to generate a 30-minute presigned GET URL for package download."""

    def __init__(
        self,
        package_repo: IExportPackageRepository,
        storage_gateway: IStorageGateway,
    ) -> None:
        self._package_repo = package_repo
        self._storage_gateway = storage_gateway

    async def execute(
        self,
        project_id: str,
        package_id: str,
        expires_seconds: int = 1800,
    ) -> str:
        package = await self._package_repo.get_by_id(package_id)
        if not package or package.project_id != project_id:
            raise ExportPackageNotFoundError(
                f"Export package '{package_id}' not found in project '{project_id}'."
            )

        if package.status != ExportStatus.READY or not package.storage_uri:
            raise ExportPackageNotFoundError(
                f"Export package '{package_id}' is not in READY status (current: {package.status.value})."
            )

        return await self._storage_gateway.get_presigned_download_url(
            storage_uri=package.storage_uri,
            expires_seconds=expires_seconds,
        )
