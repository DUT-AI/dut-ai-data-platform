import asyncio
from datetime import timedelta

import aio_pika
from loguru import logger

from core.config import rabbitmq_settings, s3_settings
from core.database.session import AsyncSessionLocal
from core.events.processor import OutboxProcessor
from core.storage.di import create_storage_provider
from modules.dataset.repository.dataset_repository import SqlDatasetRepository
from modules.dataset.use_cases.cleanup_orphaned_asset_objects import (
    CleanupOrphanedAssetObjectsUseCase,
)


async def run_outbox_processor():
    processor = OutboxProcessor()
    logger.info("Starting Outbox Processor loop...")
    while True:
        try:
            async with AsyncSessionLocal() as session:
                processed_count = await processor.process_pending_batch(
                    session, limit=50
                )
                if processed_count > 0:
                    logger.info(
                        f"Worker processed {processed_count} outbox event(s)."
                    )

            await asyncio.sleep(5)
        except asyncio.CancelledError:
            logger.info("Outbox Processor stopping...")
            break
        except Exception as e:
            logger.error(f"Outbox Processor exception: {e}. Retrying in 5 seconds...")
            await asyncio.sleep(5)


async def run_orphan_asset_cleanup():
    """Periodically remove asset objects that no asset record references."""
    if not s3_settings.orphan_cleanup_enabled:
        logger.info("Orphan asset cleanup disabled (ORPHAN_CLEANUP_ENABLED=false).")
        return

    storage = create_storage_provider()
    interval = s3_settings.orphan_cleanup_interval_seconds
    logger.info(
        "Starting orphan asset cleanup every {}s (dry_run={}, min_age={}h)...",
        interval,
        s3_settings.orphan_cleanup_dry_run,
        s3_settings.orphan_cleanup_min_age_hours,
    )
    while True:
        try:
            async with AsyncSessionLocal() as session:
                use_case = CleanupOrphanedAssetObjectsUseCase(
                    repo=SqlDatasetRepository(session),
                    storage=storage,
                    bucket=s3_settings.default_bucket,
                )
                await use_case.execute(
                    min_age=timedelta(hours=s3_settings.orphan_cleanup_min_age_hours),
                    dry_run=s3_settings.orphan_cleanup_dry_run,
                )
        except asyncio.CancelledError:
            logger.info("Orphan asset cleanup stopping...")
            break
        except Exception as e:
            logger.error(f"Orphan asset cleanup failed: {e}. Retrying next cycle.")
        await asyncio.sleep(interval)


async def run_rabbitmq_consumer():
    logger.info(f"Connecting to RabbitMQ AMQP broker at {rabbitmq_settings.rabbitmq_url}...")
    while True:
        try:
            connection = await aio_pika.connect_robust(rabbitmq_settings.rabbitmq_url)
            async with connection:
                channel = await connection.channel()

                # Declare queue for general background tasks
                queue = await channel.declare_queue(
                    "background_tasks_queue",
                    durable=True,
                )

                logger.info("Worker connected via AMQP! Waiting for background tasks on 'background_tasks_queue'...")

                async with queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        async with message.process():
                            logger.info(f"Received background task payload: {message.body.decode()}")
                            # Placeholder for background task handling
        except asyncio.CancelledError:
            logger.info("RabbitMQ Consumer stopping...")
            break
        except Exception as e:
            logger.error(f"Worker AMQP exception: {e}. Retrying in 5 seconds...")
            await asyncio.sleep(5)


async def worker_loop():
    """Background Task Worker entrypoint.

    Listens to RabbitMQ AMQP task queue for async jobs (e.g. batch asset processing,
    dataset export) and processes Transactional Outbox events.
    """
    logger.info("Initializing DUT AI Data Platform Worker (AMQP + Outbox Processor)...")
    await asyncio.gather(
        run_outbox_processor(),
        run_rabbitmq_consumer(),
        run_orphan_asset_cleanup(),
    )


def main():
    try:
        asyncio.run(worker_loop())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user.")


if __name__ == "__main__":
    main()

