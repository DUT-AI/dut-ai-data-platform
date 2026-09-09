from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from core.config import inference_settings
from modules.inference.application.dtos import InferenceRequestDTO
from modules.inference.application.use_cases.execute_inference import ExecuteInferenceUseCase
from modules.inference.infrastructure.clients.vllm_client import VLLMRuntimeClient


def test_inference_settings_defaults():
    assert inference_settings.llm_api_base_url == "https://llm2.dutai.site/v1"
    assert inference_settings.llm_default_model == "ggml-org/gemma-4-e4b-it-GGUF:Q4_0"
    assert inference_settings.llm_api_key == "no-need"


@pytest.mark.asyncio
@patch("httpx.AsyncClient.post")
async def test_vllm_runtime_client_predict_success(mock_post):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "Hello from Gemma 4 E4B!",
                }
            }
        ]
    }
    mock_post.return_value = mock_response

    client = VLLMRuntimeClient()
    result = await client.predict(
        prompt="Tell me a joke",
        model="ggml-org/gemma-4-e4b-it-GGUF:Q4_0",
    )

    assert result == "Hello from Gemma 4 E4B!"
    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert "https://llm2.dutai.site/v1/chat/completions" in args[0]
    assert kwargs["json"]["model"] == "ggml-org/gemma-4-e4b-it-GGUF:Q4_0"


@pytest.mark.asyncio
async def test_execute_inference_use_case():
    mock_client = AsyncMock()
    mock_client.predict.return_value = "Gemma model response"

    use_case = ExecuteInferenceUseCase(runtime_client=mock_client)
    dto = InferenceRequestDTO(
        prompt="Explain quantum physics",
        model="ggml-org/gemma-4-e4b-it-GGUF:Q4_0",
    )

    response = await use_case.execute(dto)

    assert response.status == "COMPLETED"
    assert response.content == "Gemma model response"
    assert response.model_name == "ggml-org/gemma-4-e4b-it-GGUF:Q4_0"
    assert response.latency_ms >= 0.0
    mock_client.predict.assert_called_once_with(
        prompt="Explain quantum physics",
        model="ggml-org/gemma-4-e4b-it-GGUF:Q4_0",
        system_prompt=None,
        temperature=0.7,
        max_tokens=2048,
    )
