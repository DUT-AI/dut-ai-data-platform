from collections.abc import Iterable, Sequence

from core.exceptions import ForbiddenError, NotFoundException
from modules.project.domain.access import IProjectScopeResolver, ProjectResourceKind
from modules.project.domain.interfaces import IProjectRepository

NOT_A_MEMBER_MESSAGE = "Bạn không phải là thành viên hoạt động trong dự án này."

_RESOURCE_LABELS: dict[ProjectResourceKind, str] = {
    "dataset": "Dataset",
    "version": "Dataset Version",
    "asset": "Asset",
    "annotation": "Annotation",
    "revision": "Annotation Revision",
}


def role_required_message(allowed_roles: Sequence[str]) -> str:
    return f"Yêu cầu quyền một trong các vai trò: {', '.join(allowed_roles)}."


class ProjectAuthorizer:
    """Single place that decides whether a user may act inside a project.

    Error policy:
    - the addressed resource does not exist -> ``NotFoundException`` (404)
    - the user is not an active member of the owning project, or has a role
      outside ``allowed_roles`` -> ``ForbiddenError`` (403)
    """

    def __init__(
        self, members: IProjectRepository, scope: IProjectScopeResolver
    ) -> None:
        self.members = members
        self.scope = scope

    async def require_role(
        self, project_id: str, user_id: int, allowed_roles: Sequence[str]
    ) -> str:
        member = await self.members.get_member(project_id, user_id)
        if not member or member.status != "active":
            raise ForbiddenError(NOT_A_MEMBER_MESSAGE)
        if member.role not in allowed_roles:
            raise ForbiddenError(role_required_message(allowed_roles))
        return member.role

    async def require_resource_role(
        self,
        kind: ProjectResourceKind,
        resource_id: str,
        user_id: int,
        allowed_roles: Sequence[str],
    ) -> str:
        project_id = await self.scope.project_of(kind, resource_id)
        if project_id is None:
            raise NotFoundException(f"{_RESOURCE_LABELS[kind]} '{resource_id}' not found.")
        return await self.require_role(project_id, user_id, allowed_roles)

    async def require_assets_role(
        self,
        asset_ids: Iterable[str],
        user_id: int,
        allowed_roles: Sequence[str],
        *,
        project_id: str | None = None,
        require_existing: bool = True,
    ) -> str | None:
        """Authorize a batch of assets that must all live in one project.

        - ``project_id`` given: every existing asset must belong to it.
        - ``require_existing``: an unknown asset id raises 404; otherwise unknown
          ids are ignored (they carry no data to leak).

        Returns the project id that was authorized, or ``None`` when nothing
        needed authorizing (no known asset and no ``project_id``).
        """
        ids = list(dict.fromkeys(asset_ids))
        owners = await self.scope.projects_of_assets(ids)

        if require_existing:
            missing = [asset_id for asset_id in ids if asset_id not in owners]
            if missing:
                raise NotFoundException(f"Asset '{missing[0]}' not found.")

        projects = set(owners.values())
        if project_id is not None:
            projects.add(project_id)
        if not projects:
            return None
        if len(projects) > 1:
            raise ForbiddenError(
                "Các asset trong yêu cầu phải thuộc cùng một dự án mà bạn có quyền."
            )

        (target_project_id,) = projects
        await self.require_role(target_project_id, user_id, allowed_roles)
        return target_project_id
