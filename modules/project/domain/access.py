from collections.abc import Iterable
from typing import Literal, Protocol

ProjectResourceKind = Literal["dataset", "version", "asset", "annotation", "revision"]


class IProjectAccessChecker(Protocol):
    """Integration contract implemented by the Project Member module."""

    async def accessible_project_ids(self, user_id: int) -> set[str]: ...


class IProjectScopeResolver(Protocol):
    """Resolves which project owns a project-scoped resource.

    Used to authorize routes that address a resource by its own id
    (``/datasets/{dataset_id}``, ``/assets/{asset_id}``...) instead of by
    ``project_id``. Every lookup returns ``None`` when the resource does not exist.
    """

    async def project_of(
        self, kind: ProjectResourceKind, resource_id: str
    ) -> str | None: ...

    async def projects_of_assets(self, asset_ids: Iterable[str]) -> dict[str, str]:
        """Map each existing asset id to its project id; unknown ids are omitted."""
        ...
