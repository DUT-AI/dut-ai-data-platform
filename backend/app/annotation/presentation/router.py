from typing import Any

from app.annotation.application.dtos import (
    AnnotationCreateDTO,
    AnnotationResponseDTO,
    AnnotationRevisionResponseDTO,
    OpenInLabelStudioRequestDTO,
    OpenInLabelStudioResponseDTO,
    RevisionCreateDTO,
)
from app.annotation.application.use_cases import (
    CreateAnnotationUseCase,
    CreateRevisionUseCase,
    GetAnnotationDetailUseCase,
    GetRevisionDetailUseCase,
    ListAnnotationRevisionsUseCase,
    ListAssetAnnotationsUseCase,
    OpenAssetInLabelStudioUseCase,
    SyncLabelStudioWebhookUseCase,
)
from app.common.deps import CurrentUser
from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Body, status

annotation_router = APIRouter(tags=["Annotations"])


# ---------------------------------------------------------------------------
# Asset annotations (list / create)
# ---------------------------------------------------------------------------


@annotation_router.get(
    "/api/v1/assets/{asset_id}/annotations",
    response_model=list[AnnotationResponseDTO],
)
@inject
async def list_asset_annotations(
    asset_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListAssetAnnotationsUseCase],
):
    return await use_case.execute(asset_id)


@annotation_router.post(
    "/api/v1/assets/{asset_id}/open-in-label-studio",
    response_model=OpenInLabelStudioResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Open asset in Label Studio",
    description=(
        "Tạo hoặc tái dùng LS Project + Task cho asset này. "
        "Trả về task_url để frontend redirect đến Label Studio task thật."
    ),
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


# ---------------------------------------------------------------------------
# Annotations CRUD
# ---------------------------------------------------------------------------


@annotation_router.post(
    "/api/v1/annotations",
    response_model=AnnotationResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
@inject
async def create_annotation(
    payload: AnnotationCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateAnnotationUseCase],
):
    user_id: str = str(
        getattr(current_user, "user_id", None) or getattr(current_user, "id", "system")
    )
    return await use_case.execute(payload, created_by=user_id)


@annotation_router.get(
    "/api/v1/annotations/{annotation_id}",
    response_model=AnnotationResponseDTO,
)
@inject
async def get_annotation_detail(
    annotation_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetAnnotationDetailUseCase],
):
    return await use_case.execute(annotation_id)


@annotation_router.get(
    "/api/v1/annotations/{annotation_id}/revisions",
    response_model=list[AnnotationRevisionResponseDTO],
)
@inject
async def list_annotation_revisions(
    annotation_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListAnnotationRevisionsUseCase],
):
    return await use_case.execute(annotation_id)


# ---------------------------------------------------------------------------
# Annotation revisions
# ---------------------------------------------------------------------------


@annotation_router.post(
    "/api/v1/annotations/{annotation_id}/revisions",
    response_model=AnnotationRevisionResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
@inject
async def create_revision(
    annotation_id: str,
    payload: RevisionCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateRevisionUseCase],
):
    user_id: str = str(
        getattr(current_user, "user_id", None) or getattr(current_user, "id", "system")
    )
    return await use_case.execute(annotation_id, payload, created_by=user_id)


@annotation_router.get(
    "/api/v1/annotation-revisions/{revision_id}",
    response_model=AnnotationRevisionResponseDTO,
)
@inject
async def get_revision_detail(
    revision_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetRevisionDetailUseCase],
):
    return await use_case.execute(revision_id)


# ---------------------------------------------------------------------------
# Label Studio webhook sync (no auth — called by LS container)
# ---------------------------------------------------------------------------


@annotation_router.post(
    "/api/v1/annotations/sync",
    response_model=AnnotationRevisionResponseDTO | None,
    status_code=status.HTTP_200_OK,
)
@inject
async def sync_label_studio_webhook(
    payload: dict[str, Any] = Body(...),
    use_case: FromDishka[SyncLabelStudioWebhookUseCase] = None,  # type: ignore
):
    rev = await use_case.execute(payload)
    return rev
