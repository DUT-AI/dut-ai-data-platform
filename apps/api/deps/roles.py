from collections.abc import Awaitable, Callable
from typing import Any

from dishka.integrations.fastapi import FromDishka, inject
from fastapi import Depends, HTTPException, Request, status

from apps.api.deps.auth import get_current_user
from core.exceptions import ForbiddenError
from modules.identity.domain.entities import AuthUser
from modules.project.domain.access import ProjectResourceKind
from modules.project.services import ProjectAuthorizer

# Role groups for project-scoped resources (dataset, version, asset, annotation).
PROJECT_READ_ROLES: tuple[str, ...] = ("owner", "admin", "annotator", "reviewer")
PROJECT_WRITE_ROLES: tuple[str, ...] = ("owner", "admin")
PROJECT_LABEL_ROLES: tuple[str, ...] = ("owner", "admin", "annotator", "reviewer")

# Path parameter that carries the id of each resource kind.
RESOURCE_PATH_PARAMS: dict[ProjectResourceKind, str] = {
    "dataset": "dataset_id",
    "version": "version_id",
    "asset": "asset_id",
    "annotation": "annotation_id",
    "revision": "revision_id",
}


def require_system_role(*allowed_roles: str) -> Callable[..., Any]:
    """Require at least one platform-level role from the JWT claims."""

    allowed = {role.lower() for role in allowed_roles}

    async def dependency(
        current_user: AuthUser = Depends(get_current_user),
    ) -> str:
        roles = {role.lower() for role in current_user.role_names}
        matched = roles & allowed
        if not matched:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Yêu cầu quyền hệ thống: {', '.join(sorted(allowed))}.",
            )
        return min(matched)

    return dependency


async def authorize(check: Awaitable[str | None]) -> str | None:
    """Run a ``ProjectAuthorizer`` check, mapping 403s to the legacy HTTP shape.

    ``ForbiddenError`` keeps the ``{"detail": ...}`` body the frontend already
    handles for project role errors; ``NotFoundException`` propagates to the
    domain exception handler like any other 404.
    """
    try:
        return await check
    except ForbiddenError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=exc.message
        ) from exc


def require_project_role(*allowed_roles: str) -> Callable[..., Any]:
    """Dependency factory for routes addressed by ``{project_id}``."""

    @inject
    async def dependency(
        project_id: str,
        current_user: AuthUser = Depends(get_current_user),
        authorizer: FromDishka[ProjectAuthorizer] = None,  # type: ignore
    ) -> str:
        return await authorize(
            authorizer.require_role(project_id, current_user.id, allowed_roles)
        )

    dependency.__name__ = "require_project_role"
    return dependency


def require_resource_role(
    kind: ProjectResourceKind, *allowed_roles: str
) -> Callable[..., Any]:
    """Dependency factory for routes addressed by a resource id.

    Resolves the project that owns the resource named by the path parameter
    of ``kind`` (see ``RESOURCE_PATH_PARAMS``), then applies the same member
    and role check as ``require_project_role``.
    """
    param = RESOURCE_PATH_PARAMS[kind]

    @inject
    async def dependency(
        request: Request,
        current_user: AuthUser = Depends(get_current_user),
        authorizer: FromDishka[ProjectAuthorizer] = None,  # type: ignore
    ) -> str:
        resource_id = request.path_params[param]
        return await authorize(
            authorizer.require_resource_role(
                kind, resource_id, current_user.id, allowed_roles
            )
        )

    dependency.__name__ = f"require_{kind}_role"
    return dependency
