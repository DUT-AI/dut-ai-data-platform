import asyncio
import io
import os
from typing import Any

from core.config import s3_settings
from core.storage.interface import IStorageProvider
from modules.export.domain.interfaces import IStorageGateway


class S3StorageGateway(IStorageGateway):
    def __init__(self, storage_provider: IStorageProvider) -> None:
        self._storage = storage_provider
        self._bucket = s3_settings.default_bucket

    async def upload_package(
        self,
        project_id: str,
        package_id: str,
        file_path_or_stream: Any,
        content_type: str = "application/zip",
    ) -> str:
        key = f"projects/{project_id}/exports/{package_id}/package.zip"

        if isinstance(file_path_or_stream, str) and os.path.isfile(file_path_or_stream):
            loop = asyncio.get_running_loop()

            def _read_file() -> bytes:
                with open(file_path_or_stream, "rb") as f:
                    return f.read()

            content_bytes = await loop.run_in_executor(None, _read_file)
            await self._storage.upload(
                bucket=self._bucket,
                key=key,
                data=io.BytesIO(content_bytes),
                content_type=content_type,
            )
        else:
            await self._storage.upload(
                bucket=self._bucket,
                key=key,
                data=file_path_or_stream,
                content_type=content_type,
            )

        return f"s3://{self._bucket}/{key}"

    async def get_presigned_download_url(
        self,
        storage_uri: str,
        expires_seconds: int = 1800,
    ) -> str:
        # Resolve clean key
        clean_uri = storage_uri
        prefix = f"s3://{self._bucket}/"
        if clean_uri.startswith(prefix):
            key = clean_uri[len(prefix) :]
        elif clean_uri.startswith("/"):
            parts = clean_uri.lstrip("/").split("/", 1)
            key = parts[1] if len(parts) > 1 else parts[0]
        else:
            key = clean_uri

        return await self._storage.get_presigned_url(
            bucket=self._bucket,
            key=key,
            expires=expires_seconds,
        )

    async def delete_package(self, storage_uri: str) -> bool:
        clean_uri = storage_uri
        prefix = f"s3://{self._bucket}/"
        if clean_uri.startswith(prefix):
            key = clean_uri[len(prefix) :]
        elif clean_uri.startswith("/"):
            parts = clean_uri.lstrip("/").split("/", 1)
            key = parts[1] if len(parts) > 1 else parts[0]
        else:
            key = clean_uri

        try:
            await self._storage.delete(bucket=self._bucket, key=key)
            return True
        except Exception:
            return False
