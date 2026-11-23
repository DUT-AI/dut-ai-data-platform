"""Asset validation worker (arq).

Run one process per worker; each handles one job at a time (CPU-bound work):

    arq apps.validation_worker.main.WorkerSettings

Scale with more processes (docker compose replicas / ASSET_IMPORT_WORKERS),
not with max_jobs.
"""

from typing import Any, ClassVar

from arq import Retry
from arq.connections import RedisSettings
from arq.worker import func
from loguru import logger

from core.config import asset_import_settings, redis_settings, s3_settings
from core.database.session import AsyncSessionLocal
from core.database.unit_of_work import SqlAlchemyUnitOfWork
from core.events.outbox import SqlOutboxRepository
from core.queue.arq_queue import RedisKeyValueStore
from core.storage.di import create_storage_provider
from modules.dataset.repository.dataset_repository import SqlDatasetRepository
from modules.dataset.repository.import_job_store import KeyValueImportJobStore
from modules.dataset.services.asset_ingestion import AssetFilePreparer, AssetObjectStore
from modules.dataset.services.asset_validation import AssetObjectValidator
from modules.dataset.use_cases.process_asset_import import (
    ProcessAssetImportUseCase,
    RetryImportLater,
)
from modules.dataset.use_cases.request_asset_import import VALIDATE_ASSET_IMPORT_TASK

settings = asset_import_settings


def warn_on_unsafe_cleanup_window() -> None:
    """Objects of a running/retrying job have no asset row yet; the orphan
    cleanup must not be allowed to delete them while the job can still run."""
    min_age_seconds = s3_settings.orphan_cleanup_min_age_hours * 3600
    if min_age_seconds <= settings.max_processing_seconds:
        logger.warning(
            "ORPHAN_CLEANUP_MIN_AGE_HOURS ({}h) is not above the longest import job "
            "({}s = max_tries x job_timeout + retry delays): the orphan cleanup could "
            "delete files of jobs that are still running.",
            s3_settings.orphan_cleanup_min_age_hours,
            settings.max_processing_seconds,
        )


async def startup(ctx: dict[str, Any]) -> None:
    warn_on_unsafe_cleanup_window()
    storage = create_storage_provider()
    ctx["session_factory"] = AsyncSessionLocal
    ctx["job_store"] = KeyValueImportJobStore(
        RedisKeyValueStore(ctx["redis"]),
        key_prefix=settings.asset_import_key_prefix,
        ttl_seconds=settings.asset_import_job_ttl_seconds,
    )
    ctx["object_store"] = AssetObjectStore(storage, bucket=s3_settings.default_bucket)
    ctx["validator"] = AssetObjectValidator(
        storage,
        bucket=s3_settings.default_bucket,
        preparer=AssetFilePreparer(),
        max_file_bytes=settings.asset_import_max_file_bytes,
    )
    logger.info(
        "Validation worker ready (queue={}, max_tries={}).",
        settings.asset_import_queue_name,
        settings.asset_import_max_tries,
    )


async def validate_asset_import(ctx: dict[str, Any], job_id: str) -> str | None:
    attempt = int(ctx.get("job_try", 1))
    # One session per job: a rollback here never touches another job.
    async with ctx["session_factory"]() as session:
        use_case = ProcessAssetImportUseCase(
            job_store=ctx["job_store"],
            repo=SqlDatasetRepository(session),
            uow=SqlAlchemyUnitOfWork(session),
            validator=ctx["validator"],
            object_store=ctx["object_store"],
            outbox_repo=SqlOutboxRepository(session),
            max_tries=settings.asset_import_max_tries,
            retry_delay=settings.retry_delay,
        )
        try:
            job = await use_case.execute(job_id, attempt)
        except RetryImportLater as retry:
            logger.warning(
                "Import job {} attempt {} failed ({}); retrying in {}s.",
                job_id,
                attempt,
                retry,
                retry.defer_seconds,
            )
            raise Retry(defer=retry.defer_seconds) from retry
    return job.status if job else None


class WorkerSettings:
    functions: ClassVar[list] = [
        func(
            validate_asset_import,
            name=VALIDATE_ASSET_IMPORT_TASK,
            max_tries=settings.asset_import_max_tries,
            timeout=settings.asset_import_job_timeout_seconds,
        )
    ]
    on_startup = startup
    redis_settings = RedisSettings.from_dsn(redis_settings.redis_url)
    queue_name = settings.asset_import_queue_name
    max_jobs = 1
    job_timeout = settings.asset_import_job_timeout_seconds
    max_tries = settings.asset_import_max_tries
    # Job status lives under ASSET_IMPORT_KEY_PREFIX; don't leave arq:result:*
    # keys on a Redis shared with other services (DUT AI Manage also uses arq).
    keep_result = 0
