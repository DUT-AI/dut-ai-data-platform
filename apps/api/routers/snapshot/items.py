from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, HTTPException, Query, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.roles import require_project_role
from modules.snapshot.application.dtos.snapshot_dtos import (
    SnapshotItemListResponse,
    SnapshotItemResponse,
    SnapshotManifestResponse,
)
from modules.snapshot.application.use_cases.get_snapshot_manifest import (
    GetSnapshotManifestUseCase,
)
from modules.snapshot.application.use_cases.list_snapshot_items import (
    ListSnapshotItemsUseCase,
)
from modules.snapshot.domain.exceptions import SnapshotNotFoundError

router = APIRouter(tags=["Snapshot Items & Manifest"])


@router.get(
    "/projects/{project_id}/snapshots/{snapshot_id}/manifest",
    response_model=SnapshotManifestResponse,
    summary="Get snapshot manifest metadata and S3 storage URI",
)
@inject
async def get_snapshot_manifest(
    project_id: str,
    snapshot_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetSnapshotManifestUseCase],
    role: str = Depends(
        require_project_role("owner", "admin", "annotator", "reviewer")
    ),
):
    try:
        manifest = await use_case.execute(project_id, snapshot_id)
        return SnapshotManifestResponse(
            snapshot_id=manifest.snapshot_id,
            dataset_version_id=manifest.dataset_version_id,
            ontology_version_id=manifest.ontology_version_id,
            asset_count=manifest.asset_count,
            annotation_count=manifest.annotation_count,
            split_distribution=manifest.split_distribution,
            class_distribution=manifest.class_distribution,
            aggregate_checksum=manifest.aggregate_checksum,
            storage_uri=manifest.storage_uri,
            created_at=manifest.created_at,
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
    "/projects/{project_id}/snapshots/{snapshot_id}/items",
    response_model=SnapshotItemListResponse,
    summary="List snapshot items via Keyset/Cursor streaming pagination",
)
@inject
async def list_snapshot_items(
    project_id: str,
    snapshot_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListSnapshotItemsUseCase],
    cursor: str | None = Query(None, description="ULID of last item for Keyset seek"),
    limit: int = Query(100, ge=1, le=1000, description="Items per page"),
    split: str | None = Query(
        None, description="Optional split filter: train, validation, test"
    ),
    role: str = Depends(
        require_project_role("owner", "admin", "annotator", "reviewer")
    ),
):
    try:
        items, next_cursor, total_count = await use_case.execute(
            project_id=project_id,
            snapshot_id=snapshot_id,
            cursor=cursor,
            limit=limit,
            split=split,
        )
        return SnapshotItemListResponse(
            items=[
                SnapshotItemResponse(
                    id=item.id,
                    snapshot_id=item.snapshot_id,
                    asset_id=item.asset_id,
                    annotation_revision_id=item.annotation_revision_id,
                    split=item.split,
                    item_checksum=item.item_checksum,
                    sort_order=item.sort_order,
                )
                for item in items
            ],
            next_cursor=next_cursor,
            total_count=total_count,
        )
    except SnapshotNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
