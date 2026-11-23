import json

from core.queue.interface import IKeyValueStore
from modules.dataset.domain.import_job import ImportJob
from modules.dataset.domain.interfaces import IAssetImportJobStore


class KeyValueImportJobStore(IAssetImportJobStore):
    """Stores each job as JSON under ``{prefix}import_job:{id}`` with a TTL."""

    def __init__(self, store: IKeyValueStore, key_prefix: str, ttl_seconds: int) -> None:
        self._store = store
        self._key_prefix = key_prefix
        self._ttl_seconds = ttl_seconds

    def _key(self, job_id: str) -> str:
        return f"{self._key_prefix}import_job:{job_id}"

    async def save(self, job: ImportJob) -> None:
        await self._store.set(
            self._key(job.id), json.dumps(job.to_dict()), ttl_seconds=self._ttl_seconds
        )

    async def get(self, job_id: str) -> ImportJob | None:
        raw = await self._store.get(self._key(job_id))
        return ImportJob.from_dict(json.loads(raw)) if raw else None
