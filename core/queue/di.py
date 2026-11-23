from collections.abc import AsyncIterable

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings
from dishka import Provider, Scope, provide

from core.config import asset_import_settings, redis_settings
from core.queue.arq_queue import ArqJobQueue, RedisKeyValueStore
from core.queue.interface import IJobQueue, IKeyValueStore


class QueueProvider(Provider):
    """Redis connection shared by the job queue and the job status store."""

    scope = Scope.APP

    @provide
    async def get_arq_redis(self) -> AsyncIterable[ArqRedis]:
        redis = await create_pool(
            RedisSettings.from_dsn(redis_settings.redis_url),
            default_queue_name=asset_import_settings.asset_import_queue_name,
        )
        try:
            yield redis
        finally:
            await redis.aclose()

    @provide
    def get_job_queue(self, redis: ArqRedis) -> IJobQueue:
        return ArqJobQueue(redis, asset_import_settings.asset_import_queue_name)

    @provide
    def get_key_value_store(self, redis: ArqRedis) -> IKeyValueStore:
        return RedisKeyValueStore(redis)
