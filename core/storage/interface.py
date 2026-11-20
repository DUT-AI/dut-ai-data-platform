from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import datetime
from typing import BinaryIO


@dataclass(frozen=True)
class StoredObjectInfo:
    key: str
    size: int
    last_modified: datetime


class IStorageProvider(ABC):
    """Abstract interface for S3 / Object Storage Operations.

    Exactly one method per operation; optional arguments are keyword-only so
    adapters and callers cannot silently swap ``content_type`` and ``expires``.
    """

    @abstractmethod
    async def upload(
        self,
        bucket: str,
        key: str,
        data: BinaryIO,
        content_type: str | None = None,
    ) -> str:
        """Upload data stream to object storage and return relative URI (e.g. /{bucket}/{key})."""

    @abstractmethod
    async def get_presigned_url(
        self, bucket: str, key: str, *, expires: int = 3600
    ) -> str:
        """Generate a presigned GET URL for temporary downloading."""

    @abstractmethod
    async def get_presigned_upload_url(
        self,
        bucket: str,
        key: str,
        *,
        content_type: str | None = None,
        expires: int = 3600,
    ) -> str:
        """Generate a presigned PUT URL for temporary uploading."""

    @abstractmethod
    async def delete(self, bucket: str, key: str) -> None:
        """Delete an object from bucket."""

    @abstractmethod
    def list_objects(
        self, bucket: str, *, prefix: str = ""
    ) -> AsyncIterator[StoredObjectInfo]:
        """Iterate every object under ``prefix``, page by page."""

    @abstractmethod
    def build_public_url(self, uri_or_path: str, bucket: str | None = None) -> str:
        """Build a full public direct GET URL from a relative object path."""
