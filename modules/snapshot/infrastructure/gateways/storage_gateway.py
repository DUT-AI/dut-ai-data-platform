import io

from core.config import s3_settings
from core.storage.interface import IStorageProvider
from modules.snapshot.domain.interfaces import StorageGateway


class MinIOStorageGateway(StorageGateway):
    """Storage Gateway for uploading and managing Snapshot Manifests."""

    def __init__(self, storage_provider: IStorageProvider) -> None:
        self._storage = storage_provider
        self._bucket = s3_settings.default_bucket

    async def upload_manifest(self, path: str, content: bytes) -> str:
        stream = io.BytesIO(content)
        key = path.lstrip("/")
        await self._storage.upload(
            bucket=self._bucket,
            key=key,
            data=stream,
            content_type="application/json",
        )
        return f"s3://{self._bucket}/{key}"

    async def delete_object(self, uri: str) -> bool:
        # Strip s3://bucket/ or leading slash
        clean_uri = uri
        prefix = f"s3://{self._bucket}/"
        if clean_uri.startswith(prefix):
            key = clean_uri[len(prefix) :]
        else:
            parts = clean_uri.lstrip("/").split("/", 1)
            key = parts[1] if len(parts) > 1 else parts[0]

        try:
            await self._storage.delete(bucket=self._bucket, key=key)
            return True
        except Exception:
            return False
