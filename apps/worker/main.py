import asyncio

import aio_pika
from loguru import logger

from core.config import rabbitmq_settings


async def worker_loop():
    """Background Task Worker entrypoint.

    Listens to RabbitMQ AMQP task queue for async jobs (e.g. batch asset processing,
    dataset export, Label Studio synchronization).
    """
    logger.info("Initializing DUT AI Data Platform Worker (AMQP)...")
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
            logger.info("Worker stopping...")
            break
        except Exception as e:
            logger.error(f"Worker AMQP exception: {e}. Retrying in 5 seconds...")
            await asyncio.sleep(5)


def main():
    try:
        asyncio.run(worker_loop())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user.")


if __name__ == "__main__":
    main()
