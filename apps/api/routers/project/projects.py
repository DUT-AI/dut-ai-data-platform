from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, Query, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.roles import require_project_role
from modules.project.dtos.project_dtos import (
    ProjectCreateDTO,
    ProjectResponseDTO,
    ProjectUpdateDTO,
)
from modules.project.use_cases import (
    ArchiveProjectUseCase,
    CreateProjectUseCase,
    GetProjectUseCase,
    ListUserProjectsUseCase,
    RestoreProjectUseCase,
    UpdateProjectUseCase,
)

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post(
    "",
    response_model=ProjectResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
)
@inject
async def create_project(
    payload: ProjectCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateProjectUseCase],
):
    return await use_case.execute(payload, owner_id=current_user.id)


@router.get(
    "",
    response_model=list[ProjectResponseDTO],
    summary="List all accessible projects for current user",
)
@inject
async def list_projects(
    current_user: CurrentUser,
    use_case: FromDishka[ListUserProjectsUseCase],
    status_filter: str = Query(
        "active", alias="status", description="Filter by status"
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    task_definition_version_id: str | None = Query(None),
    sort_by: str = Query("created_at", pattern="^(created_at|updated_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
):
    user_id_str = str(current_user.id)
    return await use_case.execute(
        user_id=user_id_str,
        status=status_filter,
        page=page,
        page_size=page_size,
        search=search,
        task_definition_version_id=task_definition_version_id,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/{project_id}",
    response_model=ProjectResponseDTO,
    summary="Get project details",
)
@inject
async def get_project(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetProjectUseCase],
    role: str = Depends(
        require_project_role("owner", "admin", "annotator", "reviewer")
    ),
):
    return await use_case.execute(project_id)


@router.put(
    "/{project_id}",
    response_model=ProjectResponseDTO,
    summary="Update project details",
)
@router.patch(
    "/{project_id}",
    response_model=ProjectResponseDTO,
    summary="Partially update project details",
)
@inject
async def update_project(
    project_id: str,
    payload: ProjectUpdateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateProjectUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    return await use_case.execute(project_id, payload)


@router.delete(
    "/{project_id}",
    response_model=ProjectResponseDTO,
    summary="Archive a project",
)
@inject
async def archive_project(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ArchiveProjectUseCase],
    role: str = Depends(require_project_role("owner")),
):
    return await use_case.execute(project_id)


@router.post("/{project_id}/archive", response_model=ProjectResponseDTO)
@inject
async def archive_project_action(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ArchiveProjectUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    return await use_case.execute(project_id)


@router.post("/{project_id}/restore", response_model=ProjectResponseDTO)
@inject
async def restore_project(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[RestoreProjectUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    return await use_case.execute(project_id)
