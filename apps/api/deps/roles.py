from collections.abc import Callable
from typing import Any

from dishka.integrations.fastapi import FromDishka, inject
from fastapi import Depends, HTTPException, status

from apps.api.deps.auth import get_current_user
from modules.identity.domain.entities import AuthUser
from modules.project.domain.interfaces import IProjectRepository


def require_project_role(*allowed_roles: str) -> Callable[..., Any]:
    """Dependency factory that checks if current user has the required project role."""

    @inject
    async def dependency(
        project_id: str,
        current_user: AuthUser = Depends(get_current_user),
        repo: FromDishka[IProjectRepository] = None,  # type: ignore
    ) -> str:
        user_id_str = str(current_user.id)
        member = await repo.get_member(project_id, user_id_str)
        if not member or member.status != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không phải là thành viên hoạt động trong dự án này.",
            )

        if member.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Yêu cầu quyền một trong các vai trò: {', '.join(allowed_roles)}.",
            )

        return member.role

    return dependency
