from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from domain.value_objects.pagination import PaginatedResult, PaginationParams

T = TypeVar("T")
ID = TypeVar("ID")


class BaseRepository(ABC, Generic[T, ID]):
    @abstractmethod
    async def get_by_id(self, entity_id: ID) -> T | None:
        """Fetch entity by primary key."""

    @abstractmethod
    async def list_all(self, params: PaginationParams) -> PaginatedResult[T]:
        """Fetch paginated list of entities."""

    @abstractmethod
    async def save(self, entity: T) -> T:
        """Create or update entity."""

    @abstractmethod
    async def delete(self, entity_id: ID) -> bool:
        """Delete entity by ID."""
