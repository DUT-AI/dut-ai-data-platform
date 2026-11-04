from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Body, Depends

from apps.api.deps.auth import CurrentUser
from apps.api.deps.roles import require_project_role
from modules.project.dtos.project_dtos import (
    ProjectConfigurationResponseDTO,
    UpdateConfigurationDTO,
)
from modules.project.use_cases import (
    GetProjectConfigUseCase,
    UpdateProjectConfigUseCase,
)

router = APIRouter(prefix="/projects", tags=["Project Configuration"])


@router.get(
    "/{project_id}/config",
    response_model=ProjectConfigurationResponseDTO,
    summary="Get project configuration",
)
@inject
async def get_config(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetProjectConfigUseCase],
    role: str = Depends(
        require_project_role("owner", "admin", "annotator", "reviewer")
    ),
):
    return await use_case.execute(project_id)


@router.put(
    "/{project_id}/config",
    response_model=ProjectConfigurationResponseDTO,
    summary="Update project configuration",
)
@inject
async def update_config(
    project_id: str,
    payload: dict = Body(...),
    current_user: CurrentUser = None,  # type: ignore
    use_case: FromDishka[UpdateProjectConfigUseCase] = None,  # type: ignore
    role: str = Depends(require_project_role("owner", "admin")),
):
    return await use_case.execute(project_id, payload)


@router.get(
    "/{project_id}/configuration", response_model=ProjectConfigurationResponseDTO
)
@inject
async def get_configuration(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetProjectConfigUseCase],
    role: str = Depends(
        require_project_role("owner", "admin", "annotator", "reviewer")
    ),
):
    return await use_case.execute(project_id)


@router.patch(
    "/{project_id}/configuration", response_model=ProjectConfigurationResponseDTO
)
@inject
async def patch_configuration(
    project_id: str,
    payload: UpdateConfigurationDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateProjectConfigUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    return await use_case.execute(project_id, payload.model_dump(exclude_unset=True))
