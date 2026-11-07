from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Query, status

from apps.api.deps.auth import CurrentUser
from modules.annotation.dtos.annotation_dtos import (
    AnnotationResponseDTO,
    OpenInLabelStudioRequestDTO,
    OpenInLabelStudioResponseDTO,
)
from modules.annotation.use_cases import (
    ListAssetAnnotationsUseCase,
    OpenAssetInLabelStudioUseCase,
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


@router.post(
    "/{asset_id}/open-in-label-studio",
    response_model=OpenInLabelStudioResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Open asset in Label Studio (Legacy/External)",
    deprecated=True,
)
@inject
async def open_asset_in_label_studio(
    asset_id: str,
    payload: OpenInLabelStudioRequestDTO,
    current_user: CurrentUser,
    use_case: FromDishka[OpenAssetInLabelStudioUseCase],
):
    result = await use_case.execute(
        asset_id=asset_id,
        project_id=payload.project_id,
        ontology_version_id=payload.ontology_version_id,
        presigned_url=payload.presigned_url,
        dataset_version_id=payload.dataset_version_id,
    )
    return OpenInLabelStudioResponseDTO(
        task_url=result.task_url,
        ls_project_id=result.ls_project_id,
        ls_task_id=result.ls_task_id,
    )
