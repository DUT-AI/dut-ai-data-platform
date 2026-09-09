import asyncio

from loguru import logger

from core.config import redis_settings
from core.database.session import AsyncSessionLocal
from core.events.processor import OutboxProcessor


async def worker_loop():
    """Background Task Worker entrypoint.

    Listens to Redis task queue for async jobs (e.g. batch asset processing,
    dataset export, Label Studio synchronization) and processes Transactional
    Outbox events.
    """
    logger.info("Initializing DUT AI Data Platform Worker...")
    logger.info(f"Connecting to Redis at {redis_settings.redis_url}...")

    processor = OutboxProcessor()

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
            logger.info("Worker stopping...")
            break
        except Exception as e:
            logger.error(f"Worker exception: {e}")
            await asyncio.sleep(5)


def main():
    try:
        asyncio.run(worker_loop())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user.")


if __name__ == "__main__":
    main()
