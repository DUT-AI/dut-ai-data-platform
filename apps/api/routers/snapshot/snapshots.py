from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, HTTPException, Query, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.roles import require_project_role
from modules.snapshot.application.dtos.snapshot_dtos import (
    SnapshotCancelResponse,
    SnapshotCreateRequest,
    SnapshotResponse,
)
from modules.snapshot.application.use_cases.cancel_snapshot import (
    CancelSnapshotUseCase,
)
from modules.snapshot.application.use_cases.create_snapshot import (
    CreateSnapshotUseCase,
)
from modules.snapshot.application.use_cases.get_snapshot_detail import (
    GetSnapshotDetailUseCase,
)
from modules.snapshot.application.use_cases.list_snapshots import (
    ListSnapshotsUseCase,
)
from modules.snapshot.domain.exceptions import (
    SnapshotNotFoundError,
    SnapshotVersionConflictError,
)
from modules.snapshot.domain.value_objects import SnapshotStatus

router = APIRouter(tags=["Snapshots"])


@router.post(
    "/projects/{project_id}/snapshots",
    response_model=SnapshotResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Asynchronously initiate snapshot creation",
)
@inject
async def create_snapshot(
    project_id: str,
    payload: SnapshotCreateRequest,
    current_user: CurrentUser,
    use_case: FromDishka[CreateSnapshotUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    try:
        user_id = int(current_user.id)
        snapshot = await use_case.execute(
            project_id=project_id,
            request=payload,
            user_id=user_id,
        )
        return SnapshotResponse(
            id=snapshot.id,
            project_id=snapshot.project_id,
            dataset_version_id=snapshot.dataset_version_id,
            ontology_version_id=snapshot.ontology_version_id,
            version_name=snapshot.version_name,
            status=snapshot.status.value,
            selection_policy=snapshot.selection_policy.value,
            include_unannotated=snapshot.include_unannotated,
            split_strategy=snapshot.split_strategy.value,
            split_ratios=snapshot.split_ratios.to_dict(),
            split_seed=snapshot.split_seed,
            tags=snapshot.tags,
            error_code=snapshot.error_code,
            error_message=snapshot.error_message,
            created_by=snapshot.created_by,
            created_at=snapshot.created_at,
            finalized_at=snapshot.finalized_at,
            archived_at=snapshot.archived_at,
        )
    except SnapshotVersionConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "/projects/{project_id}/snapshots",
    response_model=list[SnapshotResponse],
    summary="List all snapshots for a project",
)
@inject
async def list_snapshots(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListSnapshotsUseCase],
    status_filter: SnapshotStatus | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    role: str = Depends(require_project_role("owner", "admin", "annotator", "reviewer")),
):
    snapshots = await use_case.execute(
        project_id=project_id,
        status=status_filter,
        limit=limit,
        offset=offset,
    )
    return [
        SnapshotResponse(
            id=s.id,
            project_id=s.project_id,
            dataset_version_id=s.dataset_version_id,
            ontology_version_id=s.ontology_version_id,
            version_name=s.version_name,
            status=s.status.value,
            selection_policy=s.selection_policy.value,
            include_unannotated=s.include_unannotated,
            split_strategy=s.split_strategy.value,
            split_ratios=s.split_ratios.to_dict(),
            split_seed=s.split_seed,
            tags=s.tags,
            error_code=s.error_code,
            error_message=s.error_message,
            created_by=s.created_by,
            created_at=s.created_at,
            finalized_at=s.finalized_at,
            archived_at=s.archived_at,
        )
        for s in snapshots
    ]


@router.get(
    "/projects/{project_id}/snapshots/{snapshot_id}",
    response_model=SnapshotResponse,
    summary="Get snapshot details & status",
)
@inject
async def get_snapshot_detail(
    project_id: str,
    snapshot_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetSnapshotDetailUseCase],
    role: str = Depends(require_project_role("owner", "admin", "annotator", "reviewer")),
):
    try:
        snapshot = await use_case.execute(project_id, snapshot_id)
        return SnapshotResponse(
            id=snapshot.id,
            project_id=snapshot.project_id,
            dataset_version_id=snapshot.dataset_version_id,
            ontology_version_id=snapshot.ontology_version_id,
            version_name=snapshot.version_name,
            status=snapshot.status.value,
            selection_policy=snapshot.selection_policy.value,
            include_unannotated=snapshot.include_unannotated,
            split_strategy=snapshot.split_strategy.value,
            split_ratios=snapshot.split_ratios.to_dict(),
            split_seed=snapshot.split_seed,
            tags=snapshot.tags,
            error_code=snapshot.error_code,
            error_message=snapshot.error_message,
            created_by=snapshot.created_by,
            created_at=snapshot.created_at,
            finalized_at=snapshot.finalized_at,
            archived_at=snapshot.archived_at,
        )
    except SnapshotNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.post(
    "/projects/{project_id}/snapshots/{snapshot_id}/cancel",
    response_model=SnapshotCancelResponse,
    summary="Cancel a CREATING snapshot job",
)
@inject
async def cancel_snapshot(
    project_id: str,
    snapshot_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[CancelSnapshotUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    try:
        user_id = int(current_user.id)
        snapshot = await use_case.execute(
            project_id=project_id,
            snapshot_id=snapshot_id,
            user_id=user_id,
        )
        resp = SnapshotResponse(
            id=snapshot.id,
            project_id=snapshot.project_id,
            dataset_version_id=snapshot.dataset_version_id,
            ontology_version_id=snapshot.ontology_version_id,
            version_name=snapshot.version_name,
            status=snapshot.status.value,
            selection_policy=snapshot.selection_policy.value,
            include_unannotated=snapshot.include_unannotated,
            split_strategy=snapshot.split_strategy.value,
            split_ratios=snapshot.split_ratios.to_dict(),
            split_seed=snapshot.split_seed,
            tags=snapshot.tags,
            error_code=snapshot.error_code,
            error_message=snapshot.error_message,
            created_by=snapshot.created_by,
            created_at=snapshot.created_at,
            finalized_at=snapshot.finalized_at,
            archived_at=snapshot.archived_at,
        )
        return SnapshotCancelResponse(
            message="Snapshot creation cancelled successfully.",
            snapshot=resp,
        )
    except SnapshotNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
