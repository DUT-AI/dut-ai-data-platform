from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Query, status

from app.common.deps import CurrentUser
from app.project.application.dtos import ProjectCreateDTO, ProjectResponseDTO
from app.project.application.use_cases import (
    CreateProjectUseCase,
    GetProjectUseCase,
    ListUserProjectsUseCase,
)

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
