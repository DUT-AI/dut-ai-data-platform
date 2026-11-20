from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import RedirectResponse

from apps.api.deps.auth import CurrentUser
from apps.api.deps.roles import require_project_role
from modules.export.application.dtos.export_dtos import (
    ExportCreateRequest,
    ExportDownloadResponse,
    ExportPackageResponse,
)
from modules.export.application.use_cases.create_export_package import (
    CreateExportPackageUseCase,
)
from modules.export.application.use_cases.delete_export_package import (
    DeleteExportPackageUseCase,
)
from modules.export.application.use_cases.get_export_download_url import (
    GetExportDownloadUrlUseCase,
)
from modules.export.application.use_cases.get_export_package import (
    GetExportPackageUseCase,
)
from modules.export.application.use_cases.list_export_packages import (
    ListExportPackagesUseCase,
)
from modules.export.domain.exceptions import (
    ExportPackageNotFoundError,
    IncompatibleFormatError,
    ScaleLimitExceededError,
    SnapshotNotReadyError,
)
from modules.export.domain.value_objects import ExportStatus
from modules.snapshot.domain.exceptions import SnapshotNotFoundError

router = APIRouter(tags=["Exports"])


@router.post(
    "/projects/{project_id}/snapshots/{snapshot_id}/exports",
    response_model=ExportPackageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Initiate an export from a finalized snapshot",
)
@inject
async def create_export(
    project_id: str,
    snapshot_id: str,
    payload: ExportCreateRequest,
    current_user: CurrentUser,
    response: Response,
    use_case: FromDishka[CreateExportPackageUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    try:
        user_id = int(current_user.id)
        package, is_new = await use_case.execute(
            project_id=project_id,
            snapshot_id=snapshot_id,
            request=payload,
            user_id=user_id,
        )

        if not is_new:
            response.status_code = status.HTTP_200_OK

        return ExportPackageResponse.from_entity(package)

    except (ScaleLimitExceededError, IncompatibleFormatError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e
    except SnapshotNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        ) from e
    except SnapshotNotReadyError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.message,
        ) from e


@router.get(
    "/projects/{project_id}/exports",
    response_model=list[ExportPackageResponse],
    summary="List export packages for a project",
)
@inject
async def list_exports(
    project_id: str,
    snapshot_id: str | None = Query(None, description="Filter by snapshot ULID"),
    status_filter: ExportStatus | None = Query(
        None, alias="status", description="Filter by status"
    ),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    use_case: FromDishka[ListExportPackagesUseCase] = None,  # type: ignore
    role: str = Depends(
        require_project_role("owner", "admin", "annotator", "reviewer")
    ),
):
    packages, _ = await use_case.execute(
        project_id=project_id,
        snapshot_id=snapshot_id,
        status=status_filter,
        limit=limit,
        offset=offset,
    )
    return [ExportPackageResponse.from_entity(p) for p in packages]


@router.get(
    "/projects/{project_id}/exports/{package_id}",
    response_model=ExportPackageResponse,
    summary="Get export package details",
)
@inject
async def get_export(
    project_id: str,
    package_id: str,
    use_case: FromDishka[GetExportPackageUseCase],
    role: str = Depends(
        require_project_role("owner", "admin", "annotator", "reviewer")
    ),
):
    try:
        package = await use_case.execute(project_id=project_id, package_id=package_id)
        return ExportPackageResponse.from_entity(package)
    except ExportPackageNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        ) from e


@router.get(
    "/projects/{project_id}/exports/{package_id}/download",
    response_model=ExportDownloadResponse,
    summary="Download export package archive",
)
@inject
async def download_export(
    project_id: str,
    package_id: str,
    redirect: bool = Query(
        False, description="Whether to redirect immediately via HTTP 307"
    ),
    use_case: FromDishka[GetExportDownloadUrlUseCase] = None,  # type: ignore
    role: str = Depends(
        require_project_role("owner", "admin", "annotator", "reviewer")
    ),
):
    try:
        url = await use_case.execute(project_id=project_id, package_id=package_id)
        if redirect:
            return RedirectResponse(
                url=url, status_code=status.HTTP_307_TEMPORARY_REDIRECT
            )
        return ExportDownloadResponse(download_url=url, expires_in_seconds=1800)
    except ExportPackageNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        ) from e


@router.delete(
    "/projects/{project_id}/exports/{package_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an export package and purge storage archive",
)
@inject
async def delete_export(
    project_id: str,
    package_id: str,
    use_case: FromDishka[DeleteExportPackageUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    try:
        await use_case.execute(project_id=project_id, package_id=package_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ExportPackageNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        ) from e
