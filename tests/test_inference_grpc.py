from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from core.config import inference_settings
from modules.inference.application.dtos import InferenceRequestDTO
from modules.inference.application.use_cases.execute_inference import ExecuteInferenceUseCase
from modules.inference.infrastructure.clients.grpc_client import GRPCRuntimeClient


@pytest.mark.asyncio
@patch("grpc.aio.insecure_channel")
async def test_grpc_runtime_client_predict_success(mock_insecure_channel):
    mock_channel = MagicMock()
    mock_insecure_channel.return_value.__aenter__.return_value = mock_channel

    mock_unary_call = AsyncMock(return_value=b"Hello from gRPC Gemma 4!")
    mock_channel.unary_unary.return_value = mock_unary_call

    client = GRPCRuntimeClient(host="localhost", port=50051)
    result = await client.predict(
        prompt="Tell me a joke",
        model="ggml-org/gemma-4-e4b-it-GGUF:Q4_0",
    )

    assert result == "Hello from gRPC Gemma 4!"
    mock_channel.unary_unary.assert_called_once_with(
        "/inference.InferenceService/Predict"
    )


@pytest.mark.asyncio
async def test_execute_inference_use_case_with_grpc():
    mock_grpc_client = AsyncMock()
    mock_grpc_client.predict.return_value = "gRPC Model response content"

    use_case = ExecuteInferenceUseCase(runtime_client=mock_grpc_client)
    dto = InferenceRequestDTO(
        prompt="Summarize text",
        model="ggml-org/gemma-4-e4b-it-GGUF:Q4_0",
    )

    response = await use_case.execute(dto)

    assert response.status == "COMPLETED"
    assert response.content == "gRPC Model response content"
    assert response.model_name == "ggml-org/gemma-4-e4b-it-GGUF:Q4_0"
    mock_grpc_client.predict.assert_called_once()
