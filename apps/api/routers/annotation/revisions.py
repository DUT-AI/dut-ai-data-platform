from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, status

from apps.api.deps.auth import CurrentUser
from core.constants import SYSTEM_USER_ID
from modules.annotation.dtos.annotation_dtos import (
    AnnotationRevisionResponseDTO,
    RevisionCreateDTO,
)
from modules.annotation.use_cases import (
    CreateRevisionUseCase,
    GetRevisionDetailUseCase,
)

router = APIRouter(tags=["Annotation Revisions"])


@router.post(
    "/annotations/{annotation_id}/revisions",
    response_model=AnnotationRevisionResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new revision for an existing annotation",
)
@inject
async def create_revision(
    annotation_id: str,
    payload: RevisionCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateRevisionUseCase],
):
    raw_user_id = getattr(current_user, "user_id", None) or getattr(
        current_user, "id", None
    )
    user_id: int = (
        int(raw_user_id)
        if raw_user_id is not None and str(raw_user_id).isdigit()
        else SYSTEM_USER_ID
    )
    return await use_case.execute(annotation_id, payload, created_by=user_id)


@router.get(
    "/annotation-revisions/{revision_id}",
    response_model=AnnotationRevisionResponseDTO,
    summary="Get specific revision details",
)
@inject
async def get_revision_detail(
    revision_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetRevisionDetailUseCase],
):
    return await use_case.execute(revision_id)
