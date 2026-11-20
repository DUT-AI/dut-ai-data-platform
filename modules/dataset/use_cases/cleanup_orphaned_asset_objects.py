import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from loguru import logger

from core.storage.interface import IStorageProvider, StoredObjectInfo
from modules.dataset.domain.interfaces import IDatasetRepository

ASSET_OBJECTS_PREFIX = "project-"
# project-{project_id}/assets/{asset_id}/{filename} — see build_asset_storage_key.
SAMPLE_KEYS_LIMIT = 100
_ASSET_KEY = re.compile(r"^project-[^/]+/assets/(?P<asset_id>[^/]+)/[^/]+$")


@dataclass
class OrphanCleanupReport:
    scanned: int = 0
    skipped_unrecognized: int = 0
    skipped_too_recent: int = 0
    orphaned: int = 0
    deleted: int = 0
    failed: int = 0
    dry_run: bool = True
    sample_orphan_keys: list[str] = field(default_factory=list)


class CleanupOrphanedAssetObjectsUseCase:
    """Deletes asset objects in storage that no asset record points to.

    Orphans appear when a process dies between upload and commit, or when a
    client uploads through a presigned URL and never calls finalize-import (or
    finalize deduplicates it onto an existing asset).

    An object is kept when any of these hold:
    - its key does not match ``project-*/assets/{asset_id}/{filename}``;
    - it is younger than ``min_age`` (an upload may still be in flight);
    - an asset with that ``asset_id`` exists, or an asset ``uri`` points to it.
    Retired assets count as existing: only objects with no record are removed.
    """

    def __init__(
        self,
        repo: IDatasetRepository,
        storage: IStorageProvider,
        bucket: str,
        now: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self.repo = repo
        self.storage = storage
        self.bucket = bucket
        self.now = now

    async def execute(
        self,
        *,
        min_age: timedelta,
        dry_run: bool = True,
        batch_size: int = 500,
    ) -> OrphanCleanupReport:
        if min_age < timedelta(hours=1):
            # Presigned upload URLs live up to 1 hour; a shorter window could
            # delete an object whose finalize-import is still on its way.
            raise ValueError("min_age must be at least 1 hour.")

        report = OrphanCleanupReport(dry_run=dry_run)
        cutoff = self.now() - min_age
        batch: list[tuple[StoredObjectInfo, str]] = []

        async for obj in self.storage.list_objects(self.bucket, prefix=ASSET_OBJECTS_PREFIX):
            report.scanned += 1
            match = _ASSET_KEY.match(obj.key)
            if not match:
                report.skipped_unrecognized += 1
                continue
            if obj.last_modified > cutoff:
                report.skipped_too_recent += 1
                continue
            batch.append((obj, match["asset_id"]))
            if len(batch) >= batch_size:
                await self._process(batch, report)
                batch = []
        if batch:
            await self._process(batch, report)

        logger.info(
            "Orphan cleanup ({}): scanned={} orphaned={} deleted={} failed={} "
            "too_recent={} unrecognized={}",
            "dry-run" if dry_run else "delete",
            report.scanned,
            report.orphaned,
            report.deleted,
            report.failed,
            report.skipped_too_recent,
            report.skipped_unrecognized,
        )
        return report

    async def _process(
        self, batch: list[tuple[StoredObjectInfo, str]], report: OrphanCleanupReport
    ) -> None:
        existing_ids = await self.repo.find_existing_asset_ids(
            [asset_id for _, asset_id in batch]
        )
        referenced_uris = await self.repo.find_existing_asset_uris(
            [self._uri(obj.key) for obj, _ in batch]
        )

        for obj, asset_id in batch:
            if asset_id in existing_ids or self._uri(obj.key) in referenced_uris:
                continue
            report.orphaned += 1
            if len(report.sample_orphan_keys) < SAMPLE_KEYS_LIMIT:
                report.sample_orphan_keys.append(obj.key)
            if report.dry_run:
                continue
            try:
                await self.storage.delete(self.bucket, obj.key)
                report.deleted += 1
            except Exception as exc:
                report.failed += 1
                logger.error("Failed to delete orphaned object {}: {}", obj.key, exc)

    def _uri(self, key: str) -> str:
        return f"/{self.bucket}/{key}"
