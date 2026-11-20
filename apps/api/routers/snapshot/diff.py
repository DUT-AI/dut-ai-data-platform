from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, HTTPException, Query, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.roles import require_project_role
from modules.snapshot.application.dtos.snapshot_dtos import (
    SnapshotDiffItemDTO,
    SnapshotDiffItemsResponse,
    SnapshotDiffSummaryResponse,
)
from modules.snapshot.application.use_cases.diff_snapshots import (
    DiffSnapshotsUseCase,
)
from modules.snapshot.domain.exceptions import SnapshotNotFoundError

router = APIRouter(tags=["Snapshot Diff"])


@router.get(
    "/projects/{project_id}/snapshots/diff",
    response_model=SnapshotDiffSummaryResponse,
    summary="Compare two snapshots and return high-level summary KPIs and label deltas",
)
@inject
async def get_snapshot_diff_summary(
    project_id: str,
    base_id: str = Query(..., description="ULID of base snapshot"),
    target_id: str = Query(..., description="ULID of target snapshot"),
    current_user: CurrentUser = None,
    use_case: FromDishka[DiffSnapshotsUseCase] = None,
    role: str = Depends(
        require_project_role("owner", "admin", "annotator", "reviewer")
    ),
):
    try:
        diff = await use_case.get_summary(
            project_id=project_id,
            base_snapshot_id=base_id,
            target_snapshot_id=target_id,
        )
        return SnapshotDiffSummaryResponse(
            base_snapshot_id=diff["base_snapshot_id"],
            target_snapshot_id=diff["target_snapshot_id"],
            added_asset_count=diff["added_asset_count"],
            removed_asset_count=diff["removed_asset_count"],
            modified_annotation_count=diff["modified_annotation_count"],
            split_movement_count=diff["split_movement_count"],
            class_distribution_deltas=diff["class_distribution_deltas"],
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
    "/projects/{project_id}/snapshots/diff/items",
    response_model=SnapshotDiffItemsResponse,
    summary="List granular item-level deltas between two snapshots",
)
@inject
async def list_snapshot_diff_items(
    project_id: str,
    base_id: str = Query(..., description="ULID of base snapshot"),
    target_id: str = Query(..., description="ULID of target snapshot"),
    change_type: str = Query(
        ...,
        description="Filter by delta type: added, removed, modified, split_changed",
    ),
    cursor: str | None = Query(
        None, description="Last seen asset_id for pagination seek"
    ),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    current_user: CurrentUser = None,
    use_case: FromDishka[DiffSnapshotsUseCase] = None,
    role: str = Depends(
        require_project_role("owner", "admin", "annotator", "reviewer")
    ),
):
    try:
        items, next_cursor = await use_case.list_items(
            project_id=project_id,
            base_snapshot_id=base_id,
            target_snapshot_id=target_id,
            change_type=change_type,
            cursor=cursor,
            limit=limit,
        )
        return SnapshotDiffItemsResponse(
            items=[
                SnapshotDiffItemDTO(
                    asset_id=item["asset_id"],
                    change_type=item["change_type"],
                    base_revision_id=item.get("base_revision_id"),
                    target_revision_id=item.get("target_revision_id"),
                    base_split=item.get("base_split"),
                    target_split=item.get("target_split"),
                )
                for item in items
            ],
            next_cursor=next_cursor,
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
