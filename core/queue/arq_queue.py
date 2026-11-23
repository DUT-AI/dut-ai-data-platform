from typing import Any

from arq.connections import ArqRedis

from core.queue.interface import IJobQueue, IKeyValueStore


class ArqJobQueue(IJobQueue):
    """Enqueue jobs on a named arq queue (arq deduplicates by ``job_id``)."""

    def __init__(self, redis: ArqRedis, queue_name: str) -> None:
        self._redis = redis
        self._queue_name = queue_name

    async def enqueue(self, function: str, *args: Any, job_id: str) -> None:
        await self._redis.enqueue_job(
            function, *args, _job_id=job_id, _queue_name=self._queue_name
        )


class RedisKeyValueStore(IKeyValueStore):
    def __init__(self, redis: ArqRedis) -> None:
        self._redis = redis

    async def get(self, key: str) -> str | None:
        value = await self._redis.get(key)
        if value is None:
            return None
        return value.decode("utf-8") if isinstance(value, bytes) else str(value)

    async def set(self, key: str, value: str, *, ttl_seconds: int) -> None:
        await self._redis.set(key, value, ex=ttl_seconds)

    async def delete(self, key: str) -> None:
        await self._redis.delete(key)
