from abc import ABC, abstractmethod
from collections.abc import Sequence

from modules.project.domain.entities import ProjectEntity, ProjectMemberEntity


class IProjectRepository(ABC):
    @abstractmethod
    async def get_by_id(self, project_id: str) -> ProjectEntity | None:
        pass

    @abstractmethod
    async def list_by_user(
        self, user_id: str, offset: int = 0, limit: int = 20
    ) -> Sequence[ProjectEntity]:
        pass

    @abstractmethod
    async def save(self, project: ProjectEntity) -> ProjectEntity:
        pass

    @abstractmethod
    async def add_member(self, member: ProjectMemberEntity) -> ProjectMemberEntity:
        pass

    @abstractmethod
    async def get_member(
        self, project_id: str, user_id: str
    ) -> ProjectMemberEntity | None:
        pass

    @abstractmethod
    async def list_members(self, project_id: str) -> Sequence[ProjectMemberEntity]:
        pass

    @abstractmethod
    async def update_member(self, member: ProjectMemberEntity) -> ProjectMemberEntity:
        pass

    @abstractmethod
    async def remove_member(self, project_id: str, member_id: str) -> bool:
        pass

    @abstractmethod
    async def get_configuration(self, project_id: str) -> dict | None:
        pass

    @abstractmethod
    async def save_configuration(self, project_id: str, settings: dict) -> dict:
        pass
