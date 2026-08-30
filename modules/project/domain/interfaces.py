from collections.abc import Sequence
from typing import Protocol

from modules.project.domain.entities import ProjectEntity, ProjectMemberEntity


class IProjectRepository(Protocol):
    async def get_by_id(self, project_id: str) -> ProjectEntity | None: ...

    async def list_by_user(
        self,
        user_id: str,
        offset: int = 0,
        limit: int = 20,
        status: str | None = None,
    ) -> Sequence[ProjectEntity]: ...

    async def list_projects(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        status: str | None = None,
        task_definition_version_id: str | None = None,
        search: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        accessible_project_ids: set[str] | None = None,
        created_by: str | None = None,
    ) -> Sequence[ProjectEntity]: ...

    async def save(self, project: ProjectEntity) -> ProjectEntity: ...

    async def add_member(self, member: ProjectMemberEntity) -> ProjectMemberEntity: ...

    async def get_member(
        self, project_id: str, user_id: str
    ) -> ProjectMemberEntity | None: ...

    async def list_members(self, project_id: str) -> Sequence[ProjectMemberEntity]: ...

    async def update_member(
        self, member: ProjectMemberEntity
    ) -> ProjectMemberEntity: ...

    async def remove_member(self, project_id: str, member_id: str) -> bool: ...

    async def get_configuration(self, project_id: str) -> dict | None: ...

    async def save_configuration(self, project_id: str, settings: dict) -> dict: ...
