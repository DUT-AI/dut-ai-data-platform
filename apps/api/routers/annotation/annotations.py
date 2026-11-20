from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.roles import (
    PROJECT_LABEL_ROLES,
    PROJECT_READ_ROLES,
    authorize,
    require_resource_role,
)
from core.constants import SYSTEM_USER_ID
from modules.annotation.dtos.annotation_dtos import (
    AnnotationCreateDTO,
    AnnotationResponseDTO,
    AnnotationRevisionResponseDTO,
    BatchAssetStatusRequestDTO,
    BatchAssetStatusResponseDTO,
)
from modules.annotation.use_cases import (
    CreateAnnotationUseCase,
    GetAnnotationDetailUseCase,
    GetBatchAssetStatusUseCase,
    ListAnnotationRevisionsUseCase,
)
from modules.project.services import ProjectAuthorizer

router = APIRouter(prefix="/annotations", tags=["Annotations"])


@router.post(
    "/batch-status",
    response_model=BatchAssetStatusResponseDTO,
    summary="Get annotation completion status for a batch of asset IDs",
)
@inject
async def get_batch_asset_status(
    payload: BatchAssetStatusRequestDTO,
    current_user: CurrentUser,
    use_case: FromDishka[GetBatchAssetStatusUseCase],
    authorizer: FromDishka[ProjectAuthorizer],
):
    # Unknown ids carry no data, so only the existing assets are authorized.
    await authorize(
        authorizer.require_assets_role(
            payload.asset_ids,
            current_user.id,
            PROJECT_READ_ROLES,
            require_existing=False,
        )
    )
    return await use_case.execute(payload.asset_ids)


@router.post(
    "",
    response_model=AnnotationResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new annotation revision",
)
@inject
async def create_annotation(
    payload: AnnotationCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateAnnotationUseCase],
    authorizer: FromDishka[ProjectAuthorizer],
):
    # The asset must exist and belong to the project the annotation is filed under.
    await authorize(
        authorizer.require_assets_role(
            [payload.asset_id],
            current_user.id,
            PROJECT_LABEL_ROLES,
            project_id=payload.project_id,
        )
    )
    raw_user_id = getattr(current_user, "user_id", None) or getattr(
        current_user, "id", None
    )
    user_id: int = (
        int(raw_user_id)
        if raw_user_id is not None and str(raw_user_id).isdigit()
        else SYSTEM_USER_ID
    )
    return await use_case.execute(payload, created_by=user_id)


@router.get(
    "/{annotation_id}",
    dependencies=[Depends(require_resource_role("annotation", *PROJECT_READ_ROLES))],
    response_model=AnnotationResponseDTO,
    summary="Get annotation details with revisions",
)
@inject
async def get_annotation_detail(
    annotation_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetAnnotationDetailUseCase],
):
    return await use_case.execute(annotation_id)


@router.get(
    "/{annotation_id}/revisions",
    dependencies=[Depends(require_resource_role("annotation", *PROJECT_READ_ROLES))],
    response_model=list[AnnotationRevisionResponseDTO],
    summary="List all revisions for an annotation",
)
@inject
async def list_annotation_revisions(
    annotation_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListAnnotationRevisionsUseCase],
):
    return await use_case.execute(annotation_id)
