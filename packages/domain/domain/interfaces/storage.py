from abc import ABC, abstractmethod
from typing import BinaryIO


class IStorageProvider(ABC):
    """Domain interface for object storage operations (S3/MinIO)."""

    @abstractmethod
    async def upload(
        self, bucket: str, key: str, data: BinaryIO, content_type: str
    ) -> str:
        """Upload file and return storage URI (e.g. s3://bucket/key)."""

    @abstractmethod
    async def download(self, bucket: str, key: str) -> bytes:
        """Download file content as bytes."""

    @abstractmethod
    async def delete(self, bucket: str, key: str) -> None:
        """Delete file from storage."""

    @abstractmethod
    async def get_presigned_url(
        self, bucket: str, key: str, expires: int = 3600
    ) -> str:
        """Generate presigned download access URL."""

    @abstractmethod
    async def get_presigned_upload_url(
        self, bucket: str, key: str, content_type: str, expires: int = 3600
    ) -> str:
        """Generate presigned PUT upload URL."""
