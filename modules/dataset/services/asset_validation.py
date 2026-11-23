import tempfile
from dataclasses import dataclass

from core.exceptions import BusinessRuleViolationError
from core.storage.interface import IStorageProvider
from modules.dataset.domain.import_job import ImportItem, ImportItemError
from modules.dataset.services.asset_ingestion import (
    AssetFilePreparer,
    PreparedAssetFile,
)

# Files up to this size are buffered in memory while downloading; larger ones
# spill to a temporary file on disk.
_SPOOL_MAX_BYTES = 16 * 1024 * 1024


class AssetValidationError(Exception):
    """The file itself is unacceptable. Retrying cannot fix it."""

    def __init__(self, item: ImportItem, code: str, message: str) -> None:
        super().__init__(message)
        self.error = ImportItemError(
            asset_id=item.asset_id, filename=item.filename, code=code, message=message
        )


@dataclass(frozen=True)
class ValidatedAsset:
    item: ImportItem
    prepared: PreparedAssetFile


class AssetObjectValidator:
    """Checks an uploaded object against what the client declared.

    Raises ``AssetValidationError`` for data problems (missing object, wrong
    size or checksum, undecodable content). Storage/network failures propagate
    unchanged so the caller can retry them.
    """

    def __init__(
        self,
        storage: IStorageProvider,
        bucket: str,
        preparer: AssetFilePreparer,
        max_file_bytes: int,
    ) -> None:
        self.storage = storage
        self.bucket = bucket
        self.preparer = preparer
        self.max_file_bytes = max_file_bytes

    async def validate(self, item: ImportItem) -> ValidatedAsset:
        info = await self.storage.stat(self.bucket, item.storage_key)
        if info is None:
            raise AssetValidationError(
                item, "object_missing", "File was not uploaded to storage."
            )
        if info.size > self.max_file_bytes:
            raise AssetValidationError(
                item,
                "file_too_large",
                f"File is {info.size} bytes; the limit is {self.max_file_bytes} bytes.",
            )
        if info.size != item.file_size:
            raise AssetValidationError(
                item,
                "size_mismatch",
                f"Stored file is {info.size} bytes but {item.file_size} bytes were declared.",
            )

        content = await self._download(item.storage_key)
        try:
            prepared = self.preparer.prepare(item.filename, content, item.mime_type)
        except BusinessRuleViolationError as exc:
            raise AssetValidationError(item, "invalid_file", str(exc)) from exc

        if item.sha256 and prepared.sha256 != item.sha256.strip().lower():
            raise AssetValidationError(
                item,
                "checksum_mismatch",
                "SHA-256 of the stored file does not match the declared checksum.",
            )
        return ValidatedAsset(item=item, prepared=prepared)

    async def _download(self, key: str) -> bytes:
        with tempfile.SpooledTemporaryFile(max_size=_SPOOL_MAX_BYTES) as buffer:
            await self.storage.download(self.bucket, key, buffer)
            buffer.seek(0)
            return buffer.read()
