from modules.export.domain.entities import ExportPackageEntity
from modules.export.domain.exceptions import ExportPackageNotFoundError
from modules.export.domain.interfaces import IExportPackageRepository


class GetExportPackageUseCase:
    """Use case to fetch export package details by ID."""

    def __init__(self, package_repo: IExportPackageRepository) -> None:
        self._package_repo = package_repo

    async def execute(self, project_id: str, package_id: str) -> ExportPackageEntity:
        package = await self._package_repo.get_by_id(package_id)
        if not package or package.project_id != project_id:
            raise ExportPackageNotFoundError(
                f"Export package '{package_id}' not found in project '{project_id}'."
            )
        return package
