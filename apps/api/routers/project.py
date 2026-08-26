from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Body, Depends, Query, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.roles import require_project_role
from modules.project.dtos.project_dtos import (
    AddMemberDTO,
    ProjectConfigurationResponseDTO,
    ProjectCreateDTO,
    ProjectMemberResponseDTO,
    ProjectMemberUpdateDTO,
    ProjectResponseDTO,
    ProjectUpdateDTO,
    UpdateMemberRoleDTO,
)
from modules.project.use_cases import (
    AddProjectMemberUseCase,
    ArchiveProjectUseCase,
    CreateProjectUseCase,
    GetProjectConfigUseCase,
    GetProjectUseCase,
    ListProjectMembersUseCase,
    ListUserProjectsUseCase,
    RemoveProjectMemberUseCase,
    UpdateProjectConfigUseCase,
    UpdateProjectMemberUseCase,
    UpdateProjectUseCase,
)

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


# ---------------------------------------------------------------------------
# Project CRUD
# ---------------------------------------------------------------------------


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
    owner_id_str = str(current_user.id)
    return await use_case.execute(payload, owner_id=owner_id_str)


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
):
    user_id_str = str(current_user.id)
    return await use_case.execute(user_id=user_id_str, status=status_filter)


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


# ---------------------------------------------------------------------------
# Project Members Management
# ---------------------------------------------------------------------------


@router.get(
    "/{project_id}/members",
    response_model=list[ProjectMemberResponseDTO],
    summary="List project members",
)
@inject
async def list_members(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListProjectMembersUseCase],
    role: str = Depends(
        require_project_role("owner", "admin", "annotator", "reviewer")
    ),
):
    return await use_case.execute(project_id)


@router.post(
    "/{project_id}/members",
    response_model=ProjectMemberResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Add a member to the project",
)
@inject
async def add_member(
    project_id: str,
    payload: AddMemberDTO,
    current_user: CurrentUser,
    use_case: FromDishka[AddProjectMemberUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    return await use_case.execute(project_id, payload)


@router.put(
    "/{project_id}/members/{user_id}",
    response_model=ProjectMemberResponseDTO,
    summary="Update a project member's role",
)
@inject
async def update_member_role(
    project_id: str,
    user_id: str,
    payload: UpdateMemberRoleDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateProjectMemberUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    return await use_case.execute(
        project_id, user_id, ProjectMemberUpdateDTO(role=payload.role)
    )


@router.delete(
    "/{project_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a member from the project",
)
@inject
async def remove_member(
    project_id: str,
    user_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[RemoveProjectMemberUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    await use_case.execute(project_id, user_id)


# ---------------------------------------------------------------------------
# Project Configuration
# ---------------------------------------------------------------------------


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
    settings_dict = (
        payload.get("settings")
        if "settings" in payload and isinstance(payload["settings"], dict)
        else payload
    )
    return await use_case.execute(project_id, settings_dict)
