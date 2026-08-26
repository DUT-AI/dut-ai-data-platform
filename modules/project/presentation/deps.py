from collections.abc import Callable

from dishka.integrations.fastapi import FromDishka, inject

from core.exceptions import ForbiddenException, UnauthorizedException
from modules.identity.presentation.deps import CurrentUser
from modules.project.domain.interfaces import IProjectRepository


def require_project_role(*allowed_roles: str) -> Callable:
    """FastAPI Dependency factory checking if CurrentUser has required project role."""

    @inject
    async def role_checker(
        project_id: str,
        current_user: CurrentUser,
        repo: FromDishka[IProjectRepository],
    ) -> None:
        member = await repo.get_member(project_id, str(current_user.id))
        if not member or member.status != "active":
            raise UnauthorizedException("You are not an active member of this project.")

        # Owners always have full access
        if member.role == "owner":
            return

        if allowed_roles and member.role not in allowed_roles:
            raise ForbiddenException(
                f"Requires one of roles {allowed_roles}, but user has role '{member.role}'."
            )

    return role_checker
