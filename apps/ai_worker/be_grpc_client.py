import json
from typing import Any

import grpc
from loguru import logger

from core.config import app_settings


class BEWorkerCallbackClient:
    """Worker gRPC Client sending formatted prediction results back to BE Server."""

    def __init__(self, target_host: str = "localhost", target_port: int = 50052) -> None:
        self.target = f"{target_host}:{target_port}"

    async def submit_prediction_result(
        self,
        job_id: str,
        asset_id: str | None,
        model_name: str,
        internal_annotation_schema: dict[str, Any],
        storage_uri: str,
        latency_ms: float = 0.0,
    ) -> bool:
        """Sends prediction result payload to BE Server via gRPC channel."""
        logger.info(
            f"Worker transmitting prediction result for Job '{job_id}' to BE Server gRPC ({self.target})..."
        )

        payload = {
            "job_id": job_id,
            "asset_id": asset_id or "",
            "model_name": model_name,
            "internal_annotation_json": json.dumps(internal_annotation_schema),
            "storage_uri": storage_uri,
            "latency_ms": latency_ms,
        }

        try:
            async with grpc.aio.insecure_channel(self.target) as channel:
                stub_submit = channel.unary_unary(
                    "/inference.WorkerCallbackService/SubmitPredictionResult"
                )
                response_bytes = await stub_submit(
                    json.dumps(payload).encode("utf-8"),
                    timeout=10.0,
                )
                logger.info(
                    f"Successfully submitted Job '{job_id}' result to BE Server! Server response: {response_bytes.decode('utf-8')}"
                )
                return True
        except Exception as err:
            logger.warning(
                f"BE Server gRPC Receiver not reachable at {self.target} ({err}). Worker logged result locally."
            )
            return False
