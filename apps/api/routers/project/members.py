from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.roles import require_project_role
from modules.project.dtos.project_dtos import (
    AddMemberDTO,
    ProjectMemberResponseDTO,
    ProjectMemberUpdateDTO,
    UpdateMemberRoleDTO,
)
from modules.project.use_cases import (
    AddProjectMemberUseCase,
    ListProjectMembersUseCase,
    RemoveProjectMemberUseCase,
    UpdateProjectMemberUseCase,
)

router = APIRouter(prefix="/projects", tags=["Project Members"])


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
    user_id: int,
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
    user_id: int,
    current_user: CurrentUser,
    use_case: FromDishka[RemoveProjectMemberUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    await use_case.execute(project_id, user_id)
