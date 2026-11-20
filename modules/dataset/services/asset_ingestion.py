import io
import re
from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Any

from loguru import logger

from core.exceptions import BadRequestException
from core.storage.interface import IStorageProvider
from modules.dataset.services.metadata_extractor import AssetMetadataExtractor

_UNSAFE_KEY_CHARS = re.compile(r"[^A-Za-z0-9._-]+")
_MAX_KEY_FILENAME_LENGTH = 200


def sanitize_storage_filename(filename: str) -> str:
    """Make a client filename safe to embed in an object key.

    Drops any directory part (``../`` or ``C:\\``), replaces characters outside
    ``[A-Za-z0-9._-]`` and strips leading dots. The original filename is kept on
    the asset record; only the object key uses the sanitized form.
    """
    base = re.split(r"[\\/]", filename)[-1]
    safe = _UNSAFE_KEY_CHARS.sub("_", base).lstrip(".")
    return safe[-_MAX_KEY_FILENAME_LENGTH:] or "file"


def build_asset_storage_key(project_id: str, asset_id: str, filename: str) -> str:
    return f"project-{project_id}/assets/{asset_id}/{sanitize_storage_filename(filename)}"


@dataclass(frozen=True)
class PreparedAssetFile:
    """A validated upload, ready to be stored. Holds no I/O handles."""

    filename: str
    content: bytes
    mime_type: str
    sha256: str
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def size(self) -> int:
        return len(self.content)


class AssetFilePreparer:
    """Validates a raw upload and computes what the asset record needs."""

    def prepare(
        self, filename: str, content: bytes, mime_type: str | None
    ) -> PreparedAssetFile:
        try:
            final_mime_type, metadata = AssetMetadataExtractor.extract_metadata(
                filename, content, mime_type
            )
        except ValueError as exc:
            raise BadRequestException(str(exc)) from exc

        return PreparedAssetFile(
            filename=filename,
            content=content,
            mime_type=final_mime_type,
            sha256=AssetMetadataExtractor.calculate_sha256(content),
            metadata=metadata,
        )


@dataclass(frozen=True)
class StoredObject:
    bucket: str
    key: str
    uri: str


class AssetObjectStore:
    """Writes and removes asset objects in the configured bucket."""

    def __init__(self, storage: IStorageProvider, bucket: str) -> None:
        self.storage = storage
        self.bucket = bucket

    async def put(
        self, project_id: str, asset_id: str, prepared: PreparedAssetFile
    ) -> StoredObject:
        key = build_asset_storage_key(project_id, asset_id, prepared.filename)
        uri = await self.storage.upload(
            bucket=self.bucket,
            key=key,
            data=io.BytesIO(prepared.content),
            content_type=prepared.mime_type,
        )
        return StoredObject(bucket=self.bucket, key=key, uri=uri)

    async def delete_many(self, objects: Iterable[StoredObject]) -> None:
        """Best-effort cleanup: logs and skips objects that fail to delete."""
        for obj in objects:
            try:
                await self.storage.delete(obj.bucket, obj.key)
            except Exception as exc:
                logger.error(
                    "Failed to delete orphaned object {}/{}: {}", obj.bucket, obj.key, exc
                )
