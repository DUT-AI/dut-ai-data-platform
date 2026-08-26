import asyncio

from loguru import logger

from core.config import redis_settings


async def worker_loop():
    """Background Task Worker entrypoint.

    Listens to Redis task queue for async jobs (e.g. batch asset processing,
    dataset export, Label Studio synchronization).
    """
    logger.info("Initializing DUT AI Data Platform Worker...")
    logger.info(f"Connecting to Redis at {redis_settings.redis_url}...")

    # Placeholder for async queue consumer (ARQ / Celery / Custom worker)
    while True:
        try:
            logger.info("Worker is running and waiting for background tasks...")
            await asyncio.sleep(60)
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
