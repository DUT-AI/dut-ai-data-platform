import asyncio
import json
from typing import Any

import grpc
from loguru import logger


class WorkerCallbackServicer:
    """BE Server gRPC Servicer processing incoming Worker prediction callback payloads."""

    async def SubmitPredictionResult(self, raw_request_bytes: bytes, context: Any) -> bytes:
        """gRPC RPC method receiving prediction result from AI Worker."""
        try:
            payload = json.loads(raw_request_bytes.decode("utf-8"))
            job_id = payload.get("job_id")
            model_name = payload.get("model_name")
            storage_uri = payload.get("storage_uri")
            annotation_json = payload.get("internal_annotation_json")

            logger.info(
                f"[BE gRPC Server] Received Prediction Callback from Worker! Job: '{job_id}' | Model: '{model_name}' | S3 URI: '{storage_uri}'"
            )

            response = {
                "success": True,
                "message": f"BE Server received and acknowledged prediction result for Job {job_id}",
            }
            return json.dumps(response).encode("utf-8")
        except Exception as e:
            logger.error(f"[BE gRPC Server] Error processing worker callback payload: {e}")
            response = {"success": False, "message": str(e)}
            return json.dumps(response).encode("utf-8")


async def start_be_grpc_server(host: str = "0.0.0.0", port: int = 50052) -> grpc.aio.Server:
    """Starts the BE Server gRPC Receiver for Worker callbacks."""
    server = grpc.aio.server()
    servicer = WorkerCallbackServicer()

    # Register generic handler for dynamic gRPC callback
    rpc_handler = grpc.unary_unary_rpc_method_handler(servicer.SubmitPredictionResult)
    generic_handler = grpc.method_handlers_generic_handler(
        "inference.WorkerCallbackService",
        {"SubmitPredictionResult": rpc_handler},
    )
    server.add_generic_rpc_handlers((generic_handler,))

    server.add_insecure_port(f"{host}:{port}")
    logger.info(f"Starting BE Server gRPC Receiver listening on {host}:{port}...")
    await server.start()
    return server
