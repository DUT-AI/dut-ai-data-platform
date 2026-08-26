import asyncio

from loguru import logger

from core.config import redis_settings


async def ai_worker_loop():
    """AI / GPU Worker loop for model inference, auto-labeling, and feature extraction."""
    logger.info("Initializing DUT AI Data Platform - AI/GPU Worker...")
    logger.info(f"Connecting to Redis queue at {redis_settings.redis_url}...")

    # Check CUDA device availability if torch is present
    try:
        import torch

        has_cuda = torch.cuda.is_available()
        device_name = torch.cuda.get_device_name(0) if has_cuda else "CPU"
        logger.info(
            f"PyTorch version: {torch.__version__} | Device: {device_name} (CUDA: {has_cuda})"
        )
    except ImportError:
        logger.warning(
            "PyTorch not installed in this environment. Running in stub mode."
        )

    while True:
        try:
            logger.info("AI Worker is listening for inference/auto-labeling jobs...")
            await asyncio.sleep(60)
        except asyncio.CancelledError:
            logger.info("AI Worker shutting down...")
            break
        except Exception as e:
            logger.error(f"AI Worker error: {e}")
            await asyncio.sleep(5)


def main():
    try:
        asyncio.run(ai_worker_loop())
    except KeyboardInterrupt:
        logger.info("AI Worker stopped by user.")


if __name__ == "__main__":
    main()
