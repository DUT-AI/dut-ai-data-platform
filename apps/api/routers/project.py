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
    UpdateConfigurationDTO,
    UpdateMemberRoleDTO,
)
from modules.project.use_cases import (
    AddProjectMemberUseCase,
    ArchiveProjectUseCase,
    CreateProjectUseCase,
    GetProjectConfigUseCase,
    GetProjectTemplateUseCase,
    GetProjectUseCase,
    GetTaskDefinitionUseCase,
    ListProjectMembersUseCase,
    ListTaskDefinitionsUseCase,
    ListUserProjectsUseCase,
    RemoveProjectMemberUseCase,
    RestoreProjectUseCase,
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


@router.get("/catalog/task-categories")
async def list_task_categories():
    return [
        "computer_vision",
        "natural_language_processing",
        "audio_speech",
        "video",
        "structured_data",
        "llm_evaluation",
    ]


@router.get("/catalog/task-definitions")
@inject
async def list_task_definitions(
    use_case: FromDishka[ListTaskDefinitionsUseCase],
    category: str | None = None,
    modality: str | None = None,
    provider: str | None = None,
    search: str | None = None,
):
    return await use_case.execute(
        category=category, modality=modality, provider_key=provider, search=search
    )


@router.get("/catalog/task-definitions/{task_key}")
@inject
async def get_task_definition(
    task_key: str, use_case: FromDishka[GetTaskDefinitionUseCase]
):
    return await use_case.execute(task_key)


@router.get("/catalog/project-templates/{template_id}")
@inject
async def get_project_template(
    template_id: str, use_case: FromDishka[GetProjectTemplateUseCase]
):
    return await use_case.execute(template_id)


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
