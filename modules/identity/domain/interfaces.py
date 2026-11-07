from abc import ABC, abstractmethod
from collections.abc import Sequence
from datetime import datetime
from typing import Any, Protocol

from modules.identity.domain.entities import UserLoginMetadataEntity


class IAuthClient(Protocol):
    """Abstract protocol for external authentication client."""

    async def login(self, email: str, password: str) -> Any: ...
    async def get_me(self, token: str) -> Any: ...
    async def list_users(
        self, token: str, page: int = 1, page_size: int = 100
    ) -> Any: ...


class IUserLoginRepository(ABC):
    """Repository interface for User Login metadata persistence."""

    @abstractmethod
    async def upsert_last_login(
        self, user_id: int, last_login_at: datetime
    ) -> UserLoginMetadataEntity:
        """Atomically insert or update the last login timestamp for a user."""

    @abstractmethod
    async def get_by_user_id(self, user_id: int) -> UserLoginMetadataEntity | None:
        """Get last login metadata for a specific user ID."""

    @abstractmethod
    async def get_by_user_ids(self, user_ids: Sequence[int]) -> dict[int, datetime]:
        """Batch fetch last login timestamps mapped by user ID."""
