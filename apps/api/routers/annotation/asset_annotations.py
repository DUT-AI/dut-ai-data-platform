from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Query

from apps.api.deps.auth import CurrentUser
from modules.annotation.dtos.annotation_dtos import (
    AnnotationResponseDTO,
)
from modules.annotation.use_cases import (
    ListAssetAnnotationsUseCase,
)

router = APIRouter(prefix="/assets", tags=["Asset Annotations"])


@router.get(
    "/{asset_id}/annotations",
    response_model=list[AnnotationResponseDTO],
    summary="List all annotations for an asset",
)
@inject
async def list_asset_annotations(
    asset_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListAssetAnnotationsUseCase],
    target_type: str | None = Query(
        None, description="Filter by target type (FULL_ASSET, RECORD, TEXT_SPAN...)"
    ),
):
    return await use_case.execute(asset_id, target_type=target_type)
