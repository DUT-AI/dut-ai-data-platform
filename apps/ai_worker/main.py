import asyncio
import json

import aio_pika
from loguru import logger

from apps.ai_worker.be_grpc_client import BEWorkerCallbackClient
from core.config import inference_settings, rabbitmq_settings
from modules.inference.application.dtos import InferenceRequestDTO
from modules.inference.application.use_cases.execute_inference import ExecuteInferenceUseCase
from modules.inference.domain.services.converter import PredictionConverter
from modules.inference.infrastructure.clients.grpc_client import GRPCRuntimeClient
from modules.inference.infrastructure.clients.vllm_client import VLLMRuntimeClient
from modules.inference.infrastructure.storage.prediction_storage import S3PredictionStorage


async def ai_worker_loop():
    """AI / GPU Worker loop for model inference, auto-labeling, and feature extraction."""
    logger.info("Initializing DUT AI Data Platform - AI/GPU Worker (AMQP + Inference + S3 + gRPC Callback)...")
    logger.info(f"Inference Protocol: {inference_settings.inference_protocol.upper()}")
    logger.info(f"Target LLM Model: {inference_settings.llm_default_model}")
    logger.info(f"Connecting to RabbitMQ AMQP broker at {rabbitmq_settings.rabbitmq_url}...")

    # Initialize runtime client based on protocol selection
    if inference_settings.inference_protocol.lower() == "grpc":
        runtime_client = GRPCRuntimeClient()
    else:
        runtime_client = VLLMRuntimeClient()

    inference_use_case = ExecuteInferenceUseCase(runtime_client=runtime_client)
    s3_storage = S3PredictionStorage()
    be_grpc_client = BEWorkerCallbackClient()

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
            "PyTorch not installed in this environment. Running with remote vLLM Runtime Client."
        )

    while True:
        try:
            connection = await aio_pika.connect_robust(rabbitmq_settings.rabbitmq_url)
            async with connection:
                channel = await connection.channel()

                # Fair dispatch: prefetch 1 job at a time per GPU/AI Worker
                await channel.set_qos(prefetch_count=1)

                # Declare exchange and durable queue for AI tasks
                exchange = await channel.declare_exchange(
                    "ai_tasks_exchange",
                    type=aio_pika.ExchangeType.DIRECT,
                    durable=True,
                )

                queue = await channel.declare_queue(
                    "ai_inference_queue",
                    durable=True,
                )
                await queue.bind(exchange, routing_key="ai.inference")

                logger.info("AI Worker connected via AMQP! Listening on 'ai_inference_queue'...")

                async with queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        async with message.process():
                            raw_payload = message.body.decode()
                            logger.info(f"Received AI Job payload: {raw_payload}")

                            try:
                                payload_data = json.loads(raw_payload)
                                prompt = payload_data.get("prompt", "")
                                model = payload_data.get("model", inference_settings.llm_default_model)
                                system_prompt = payload_data.get("system_prompt")
                                asset_id = payload_data.get("asset_id")

                                request_dto = InferenceRequestDTO(
                                    prompt=prompt,
                                    model=model,
                                    system_prompt=system_prompt,
                                )

                                # Step 1: Execute AI Inference
                                result = await inference_use_case.execute(request_dto)
                                logger.info(
                                    f"Inference job {result.job_id} COMPLETED in {result.latency_ms}ms | Model: {result.model_name}"
                                )

                                # Step 2: Convert to Internal Annotation Schema
                                annotation_payload = PredictionConverter.to_internal_annotation_schema(
                                    job_id=result.job_id,
                                    asset_id=asset_id,
                                    model_name=result.model_name,
                                    raw_response=result.content,
                                    latency_ms=result.latency_ms,
                                )

                                # Step 3: Upload JSON Artifact to S3 / MinIO Storage
                                storage_uri = s3_storage.upload_prediction_artifact(
                                    job_id=result.job_id,
                                    annotation_payload=annotation_payload,
                                )

                                # Step 4: Transmit prediction result + storage_uri to BE Server via gRPC
                                await be_grpc_client.submit_prediction_result(
                                    job_id=result.job_id,
                                    asset_id=asset_id,
                                    model_name=result.model_name,
                                    internal_annotation_schema=annotation_payload,
                                    storage_uri=storage_uri,
                                    latency_ms=result.latency_ms,
                                )

                            except Exception as job_err:
                                logger.error(f"Failed to process AI inference job: {job_err}")
        except asyncio.CancelledError:
            logger.info("AI Worker shutting down...")
            break
        except Exception as e:
            logger.error(f"AI Worker AMQP connection error: {e}. Retrying in 5 seconds...")
            await asyncio.sleep(5)


def main():
    try:
        asyncio.run(ai_worker_loop())
    except KeyboardInterrupt:
        logger.info("AI Worker stopped by user.")


if __name__ == "__main__":
    main()
