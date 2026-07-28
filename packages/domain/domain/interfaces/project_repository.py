from abc import ABC, abstractmethod
from collections.abc import Sequence

from domain.entities import ProjectEntity, ProjectMemberEntity


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
