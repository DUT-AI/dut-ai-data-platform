"""Queue + job store against a real Redis (opt-in).

Set ASSET_IMPORT_REDIS_TEST_URL to a Redis you may write to (the shared one
works: keys use a random dutdp-test: prefix and are removed). Skipped otherwise.
"""

import os
import signal
import uuid

import pytest
from arq import Retry, create_pool
from arq.connections import RedisSettings
from arq.worker import Worker, func

from core.queue.arq_queue import ArqJobQueue, RedisKeyValueStore
from modules.dataset.domain.import_job import ImportItem, ImportJob
from modules.dataset.repository.import_job_store import KeyValueImportJobStore

REDIS_URL = os.environ.get("ASSET_IMPORT_REDIS_TEST_URL")
pytestmark = pytest.mark.skipif(not REDIS_URL, reason="ASSET_IMPORT_REDIS_TEST_URL not set")


@pytest.mark.asyncio
async def test_job_round_trip_retry_and_ttl():
    settings = RedisSettings.from_dsn(REDIS_URL)
    queue_name = f"dutdp-test:{uuid.uuid4().hex}"
    prefix = f"dutdp-test:{uuid.uuid4().hex}:"
    redis = await create_pool(settings, default_queue_name=queue_name)
    store = KeyValueImportJobStore(RedisKeyValueStore(redis), key_prefix=prefix, ttl_seconds=120)
    attempts: list[int] = []

    async def fake_validate(ctx, job_id: str) -> str:
        attempts.append(ctx["job_try"])
        if ctx["job_try"] < 2:
            raise Retry(defer=0)
        job = await store.get(job_id)
        job.succeed([i.asset_id for i in job.items], new_count=len(job.items), reused_count=0)
        await store.save(job)
        return job.status

    try:
        job = ImportJob(
            project_id="p",
            version_id="v",
            items=[ImportItem("a1", "a.png", "project-p/assets/a1/a.png", "s", 1)],
        )
        await store.save(job)
        await ArqJobQueue(redis, queue_name).enqueue("validate", job.id, job_id=job.id)
        # Same job id again: arq must not queue a second copy.
        await ArqJobQueue(redis, queue_name).enqueue("validate", job.id, job_id=job.id)

        worker = Worker(
            functions=[func(fake_validate, name="validate", max_tries=3)],
            redis_pool=redis,
            queue_name=queue_name,
            burst=True,
            max_jobs=1,
            poll_delay=0.05,
            handle_signals=False,
            keep_result=0,
        )
        await worker.main()
        if hasattr(signal, "SIGUSR1"):  # arq's close() signals itself; absent on Windows
            await worker.close()

        assert attempts == [1, 2]
        assert (await store.get(job.id)).status == "succeeded"
        ttl = await redis.ttl(f"{prefix}import_job:{job.id}")
        assert 0 < ttl <= 120
    finally:
        keys = await redis.keys(f"{prefix}*") + await redis.keys(f"*{queue_name}*")
        if keys:
            await redis.delete(*keys)
        await redis.aclose()
