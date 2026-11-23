from collections.abc import Callable

from loguru import logger

from core.events.domain_event import AssetReadyEvent
from core.events.outbox import IOutboxRepository
from core.uow import IUnitOfWork
from modules.dataset.domain.entities import AssetEntity
from modules.dataset.domain.import_job import ImportItem, ImportItemError, ImportJob
from modules.dataset.domain.interfaces import IAssetImportJobStore, IDatasetRepository
from modules.dataset.services.asset_ingestion import AssetObjectStore, StoredObject
from modules.dataset.services.asset_validation import (
    AssetObjectValidator,
    AssetValidationError,
    ValidatedAsset,
)


class ImportDataError(Exception):
    """The job cannot succeed with this data; retrying will not help."""

    def __init__(self, errors: list[ImportItemError]) -> None:
        super().__init__("; ".join(e.message for e in errors))
        self.errors = errors


class RetryImportLater(Exception):
    """An infrastructure error occurred; run the job again after ``defer_seconds``."""

    def __init__(self, defer_seconds: int, cause: BaseException) -> None:
        super().__init__(str(cause))
        self.defer_seconds = defer_seconds


class ProcessAssetImportUseCase:
    """Validate every file of an import job, then record all of them or none.

    - Data error (bad file, wrong checksum, version no longer draft): roll back,
      delete every stored object of the job, mark it ``failed``. No retry.
    - Infrastructure error (DB/storage unavailable, concurrent duplicate):
      roll back and keep the objects; ask for a retry until ``max_tries`` is
      reached, then delete every object and mark the job ``failed``.
    - Success: one transaction (assets, version links, outbox events) committed
      through ``IUnitOfWork``; redundant duplicate objects are removed after it.

    Safe to run more than once for the same job (arq is at-least-once).
    """

    def __init__(
        self,
        job_store: IAssetImportJobStore,
        repo: IDatasetRepository,
        uow: IUnitOfWork,
        validator: AssetObjectValidator,
        object_store: AssetObjectStore,
        outbox_repo: IOutboxRepository | None,
        max_tries: int,
        retry_delay: Callable[[int], int],
    ) -> None:
        self.job_store = job_store
        self.repo = repo
        self.uow = uow
        self.validator = validator
        self.object_store = object_store
        self.outbox_repo = outbox_repo
        self.max_tries = max_tries
        self.retry_delay = retry_delay

    async def execute(self, job_id: str, attempt: int) -> ImportJob | None:
        job = await self.job_store.get(job_id)
        if job is None:
            logger.warning("Import job {} expired or unknown; nothing to do.", job_id)
            return None
        if job.is_finished:
            return job

        job.start_attempt(attempt)
        await self.job_store.save(job)

        try:
            redundant = await self._import(job)
        except ImportDataError as failure:
            await self._abort(job, failure.errors)
            return job
        except Exception as exc:
            await self.uow.rollback()
            error = ImportItemError(
                asset_id=None,
                filename=None,
                code="infrastructure_error",
                message=f"{type(exc).__name__}: {exc}",
            )
            if attempt >= self.max_tries:
                logger.error("Import job {} failed after {} attempts: {}", job.id, attempt, exc)
                await self._abort(job, [error], already_rolled_back=True)
                return job
            job.wait_for_retry(error)
            await self.job_store.save(job)
            raise RetryImportLater(self.retry_delay(attempt), exc) from exc

        # Record success first: if saving fails the job runs again and must
        # still find every object; only then drop the duplicates' objects.
        await self.job_store.save(job)
        await self.object_store.delete_many(redundant)
        return job

    async def _import(self, job: ImportJob) -> list[StoredObject]:
        version = await self.repo.get_version_by_id(job.version_id)
        if version is None or version.status != "draft":
            raise ImportDataError(
                [
                    ImportItemError(
                        asset_id=None,
                        filename=None,
                        code="version_not_draft",
                        message=f"Dataset version '{job.version_id}' no longer accepts assets.",
                    )
                ]
            )

        validated, errors = await self._validate_all(job.items)
        if errors:
            raise ImportDataError(errors)

        imported_ids: list[str] = []
        redundant: list[StoredObject] = []
        by_hash: dict[str, AssetEntity] = {}
        new_count = 0

        for entry in validated:
            item, prepared = entry.item, entry.prepared
            # Already recorded by an earlier run of this same job (at-least-once).
            asset = (await self.repo.get_assets_by_ids([item.asset_id]) or [None])[0]
            if asset is not None:
                new_count += 1
            else:
                asset = by_hash.get(prepared.sha256) or await self.repo.find_asset_by_sha256(
                    job.project_id, prepared.sha256
                )
                if asset is not None:
                    redundant.append(self._stored(item))
                else:
                    asset = await self.repo.save_asset(self._new_asset(job, entry))
                    new_count += 1
                    await self._emit_ready(job, asset)
            by_hash[prepared.sha256] = asset
            await self.repo.add_asset_to_version(job.version_id, asset.id)
            imported_ids.append(asset.id)

        await self.uow.commit()
        job.succeed(imported_ids, new_count=new_count, reused_count=len(imported_ids) - new_count)
        return redundant

    async def _validate_all(
        self, items: list[ImportItem]
    ) -> tuple[list[ValidatedAsset], list[ImportItemError]]:
        validated: list[ValidatedAsset] = []
        errors: list[ImportItemError] = []
        for item in items:
            try:
                validated.append(await self.validator.validate(item))
            except AssetValidationError as exc:
                errors.append(exc.error)
        return validated, errors

    def _new_asset(self, job: ImportJob, entry: ValidatedAsset) -> AssetEntity:
        item, prepared = entry.item, entry.prepared
        return AssetEntity(
            id=item.asset_id,
            project_id=job.project_id,
            filename=item.filename,
            uri=self._stored(item).uri,
            mime_type=prepared.mime_type,
            file_size=prepared.size,
            sha256=prepared.sha256,
            metadata={**prepared.metadata, **(item.metadata or {})},
            data_format=item.data_format,
            status="READY",
            provenance=item.provenance,
            created_by=job.created_by,
        )

    async def _emit_ready(self, job: ImportJob, asset: AssetEntity) -> None:
        if self.outbox_repo is None:
            return
        await self.outbox_repo.save_event(
            AssetReadyEvent(
                asset_id=asset.id,
                project_id=job.project_id,
                filename=asset.filename,
                mime_type=asset.mime_type,
                file_size=asset.file_size,
                sha256=asset.sha256,
            )
        )

    def _stored(self, item: ImportItem) -> StoredObject:
        bucket = self.object_store.bucket
        key = item.storage_key.lstrip("/")
        return StoredObject(bucket=bucket, key=key, uri=f"/{bucket}/{key}")

    async def _abort(
        self,
        job: ImportJob,
        errors: list[ImportItemError],
        *,
        already_rolled_back: bool = False,
    ) -> None:
        """Undo the whole job: nothing in the DB, none of its objects in storage."""
        if not already_rolled_back:
            await self.uow.rollback()

        # Never delete an object an existing asset already points to. If the
        # database cannot tell (it is down), keep everything: the orphan
        # cleanup job removes unreferenced objects later.
        try:
            referenced = await self.repo.find_existing_asset_ids(
                [i.asset_id for i in job.items]
            )
        except Exception as exc:
            logger.error(
                "Import job {}: cannot check referenced assets, objects kept: {}", job.id, exc
            )
        else:
            await self.object_store.delete_many(
                self._stored(item) for item in job.items if item.asset_id not in referenced
            )
        job.fail(errors)
        await self.job_store.save(job)
        logger.warning(
            "Import job {} failed: {}", job.id, ", ".join(e.code for e in errors)
        )
