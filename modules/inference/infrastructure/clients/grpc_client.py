from typing import Sequence

import grpc
from loguru import logger

from core.config import inference_settings
from modules.inference.domain.interfaces import IRuntimeClient


class GRPCRuntimeClient(IRuntimeClient):
    """gRPC Client implementation for AI Runtime Server Pool (HTTP/2 + Protobuf)."""

    def __init__(
        self,
        host: str | None = None,
        port: int | None = None,
        default_model: str | None = None,
        timeout: float | None = None,
    ) -> None:
        self.host = host or inference_settings.grpc_runtime_host
        self.port = port or inference_settings.grpc_runtime_port
        self.default_model = default_model or inference_settings.llm_default_model
        self.timeout = timeout or inference_settings.llm_request_timeout
        self.target = f"{self.host}:{self.port}"

    async def predict(
        self,
        prompt: str,
        model: str | None = None,
        system_prompt: str | None = None,
        messages: Sequence[dict[str, str]] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        """Sends an inference request to the gRPC Runtime Server Pool."""
        target_model = model or self.default_model

        logger.info(
            f"Dispatching gRPC inference to Runtime Pool ({self.target}) | Model: {target_model}"
        )

        async with grpc.aio.insecure_channel(self.target) as channel:
            # We construct standard protobuf dictionary / message invocation
            try:
                # Dynamic protobuf payload or stub invocation
                stub_predict = channel.unary_unary(
                    "/inference.InferenceService/Predict",
                )
                # Simple serialization format placeholder / protobuf bytes
                payload = {
                    "prompt": prompt,
                    "model": target_model,
                    "system_prompt": system_prompt or "",
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }
                # For robust async gRPC transport demo
                response_bytes = await stub_predict(
                    str(payload).encode("utf-8"),
                    timeout=self.timeout,
                )
                return response_bytes.decode("utf-8")
            except grpc.RpcError as err:
                logger.error(f"gRPC RPC Error connecting to {self.target}: {err}")
                raise
