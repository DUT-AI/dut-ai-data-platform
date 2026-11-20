from abc import ABC, abstractmethod
from collections.abc import Sequence
from datetime import datetime
from typing import Any, Protocol

from modules.identity.domain.entities import UserLoginMetadataEntity


class IAuthClient(Protocol):
    """Abstract protocol for the DUT AI Manage auth server (local login only)."""

    async def login(self, email: str, password: str) -> Any: ...


class IUserDirectory(Protocol):
    """Application boundary for reading users from the external directory."""

    async def list(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> Any: ...


class IUserLoginRepository(ABC):
    """Repository interface for User Login metadata persistence."""

    @abstractmethod
    async def upsert_last_login(
        self, user_id: int, last_login_at: datetime
    ) -> UserLoginMetadataEntity:
        """Atomically insert or update the last login timestamp for a user."""

    @abstractmethod
    async def record_activity(
        self, user_id: int, seen_at: datetime, not_before: datetime
    ) -> None:
        """Insert the row, or move last_login_at to seen_at only if it is older than not_before."""

    @abstractmethod
    async def get_by_user_id(self, user_id: int) -> UserLoginMetadataEntity | None:
        """Get last login metadata for a specific user ID."""

    @abstractmethod
    async def get_by_user_ids(self, user_ids: Sequence[int]) -> dict[int, datetime]:
        """Batch fetch last login timestamps mapped by user ID."""
