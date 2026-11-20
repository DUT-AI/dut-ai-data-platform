from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, HTTPException, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.roles import require_project_role
from modules.snapshot.application.dtos.snapshot_dtos import (
    ReleaseTagCreateRequest,
    ReleaseTagResponse,
)
from modules.snapshot.application.use_cases.manage_release_tags import (
    ManageReleaseTagsUseCase,
)
from modules.snapshot.domain.exceptions import SnapshotNotFoundError

router = APIRouter(tags=["Snapshot Release Tags"])


@router.post(
    "/projects/{project_id}/snapshots/{snapshot_id}/tags",
    response_model=ReleaseTagResponse,
    summary="Assign or reassign a release tag to a snapshot",
)
@inject
async def assign_release_tag(
    project_id: str,
    snapshot_id: str,
    payload: ReleaseTagCreateRequest,
    current_user: CurrentUser,
    use_case: FromDishka[ManageReleaseTagsUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    try:
        user_id = int(current_user.id)
        tag = await use_case.assign_tag(
            project_id=project_id,
            snapshot_id=snapshot_id,
            name=payload.name,
            user_id=user_id,
        )
        return ReleaseTagResponse(
            name=tag.name,
            snapshot_id=tag.snapshot_id,
            project_id=tag.project_id,
            created_by=tag.created_by,
            created_at=tag.created_at,
            updated_at=tag.updated_at,
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


@router.get(
    "/projects/{project_id}/tags",
    response_model=list[ReleaseTagResponse],
    summary="List all release tags in project",
)
@inject
async def list_release_tags(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ManageReleaseTagsUseCase],
    role: str = Depends(
        require_project_role("owner", "admin", "annotator", "reviewer")
    ),
):
    tags = await use_case.list_tags(project_id)
    return [
        ReleaseTagResponse(
            name=t.name,
            snapshot_id=t.snapshot_id,
            project_id=t.project_id,
            created_by=t.created_by,
            created_at=t.created_at,
            updated_at=t.updated_at,
        )
        for t in tags
    ]


@router.delete(
    "/projects/{project_id}/tags/{name}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a release tag",
)
@inject
async def delete_release_tag(
    project_id: str,
    name: str,
    current_user: CurrentUser,
    use_case: FromDishka[ManageReleaseTagsUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    try:
        await use_case.delete_tag(project_id, name)
    except SnapshotNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
