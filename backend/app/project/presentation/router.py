from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, Query, status

from app.common.deps import CurrentUser
from app.project.application.dtos import (
    ProjectConfigDTO,
    ProjectCreateDTO,
    ProjectMemberAddDTO,
    ProjectMemberResponseDTO,
    ProjectMemberUpdateDTO,
    ProjectResponseDTO,
    ProjectUpdateDTO,
)
from app.project.application.use_cases import (
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
from app.project.presentation.deps import require_project_role

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectResponseDTO, status_code=status.HTTP_201_CREATED)
@inject
async def create_project(
    data: ProjectCreateDTO,
    use_case: FromDishka[CreateProjectUseCase],
    current_user: CurrentUser,
):
    """Create a new AI project workspace."""
    return await use_case.execute(data, owner_id=str(current_user.id))


@router.get("", response_model=list[ProjectResponseDTO])
@inject
async def list_projects(
    use_case: FromDishka[ListUserProjectsUseCase],
    current_user: CurrentUser,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List projects of the current authenticated user."""
    return await use_case.execute(str(current_user.id), page=page, page_size=page_size)


@router.get("/{project_id}", response_model=ProjectResponseDTO)
@inject
async def get_project(
    project_id: str,
    use_case: FromDishka[GetProjectUseCase],
    current_user: CurrentUser,
):
    """Get details of a specific project."""
    return await use_case.execute(project_id, str(current_user.id))


@router.put(
    "/{project_id}",
    response_model=ProjectResponseDTO,
    dependencies=[Depends(require_project_role("admin"))],
)
@inject
async def update_project(
    project_id: str,
    data: ProjectUpdateDTO,
    use_case: FromDishka[UpdateProjectUseCase],
):
    """Update project name or description (Owner/Admin)."""
    return await use_case.execute(project_id, data)


@router.delete(
    "/{project_id}",
    response_model=ProjectResponseDTO,
    dependencies=[Depends(require_project_role())],  # Owner only
)
@inject
async def archive_project(
    project_id: str,
    use_case: FromDishka[ArchiveProjectUseCase],
):
    """Archive a project (Owner only)."""
    return await use_case.execute(project_id)


# Member Management Endpoints
@router.post(
    "/{project_id}/members",
    response_model=ProjectMemberResponseDTO,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_project_role("admin"))],
)
@inject
async def add_project_member(
    project_id: str,
    data: ProjectMemberAddDTO,
    use_case: FromDishka[AddProjectMemberUseCase],
):
    """Add a new member to the project (Owner/Admin)."""
    return await use_case.execute(project_id, data)


@router.get(
    "/{project_id}/members",
    response_model=list[ProjectMemberResponseDTO],
    dependencies=[Depends(require_project_role("admin", "annotator", "reviewer"))],
)
@inject
async def list_project_members(
    project_id: str,
    use_case: FromDishka[ListProjectMembersUseCase],
):
    """List all members of the project."""
    return await use_case.execute(project_id)


@router.put(
    "/{project_id}/members/{member_id}",
    response_model=ProjectMemberResponseDTO,
    dependencies=[Depends(require_project_role("admin"))],
)
@inject
async def update_project_member(
    project_id: str,
    member_id: str,
    data: ProjectMemberUpdateDTO,
    use_case: FromDishka[UpdateProjectMemberUseCase],
):
    """Change a member's role or status (Owner/Admin)."""
    return await use_case.execute(project_id, member_id, data)


@router.delete(
    "/{project_id}/members/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_project_role("admin"))],
)
@inject
async def remove_project_member(
    project_id: str,
    member_id: str,
    use_case: FromDishka[RemoveProjectMemberUseCase],
):
    """Remove a member from the project (Owner/Admin)."""
    await use_case.execute(project_id, member_id)


# Project Configuration Endpoints
@router.get(
    "/{project_id}/config",
    response_model=ProjectConfigDTO,
    dependencies=[Depends(require_project_role("admin", "annotator", "reviewer"))],
)
@inject
async def get_project_config(
    project_id: str,
    use_case: FromDishka[GetProjectConfigUseCase],
):
    """Get JSONB project configuration."""
    return await use_case.execute(project_id)


@router.put(
    "/{project_id}/config",
    response_model=ProjectConfigDTO,
    dependencies=[Depends(require_project_role("admin"))],
)
@inject
async def update_project_config(
    project_id: str,
    data: dict,
    use_case: FromDishka[UpdateProjectConfigUseCase],
):
    """Update JSONB project configuration (Owner/Admin)."""
    return await use_case.execute(project_id, data)
