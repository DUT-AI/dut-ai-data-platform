from typing import Sequence

import httpx
from loguru import logger

from core.config import inference_settings
from modules.inference.domain.interfaces import IRuntimeClient


class VLLMRuntimeClient(IRuntimeClient):
    """OpenAI-compatible vLLM Runtime Client implementation for Gemma 4 E4B."""

    def __init__(
        self,
        base_url: str | None = None,
        default_model: str | None = None,
        api_key: str | None = None,
        timeout: float | None = None,
    ) -> None:
        self.base_url = (base_url or inference_settings.llm_api_base_url).rstrip("/")
        self.default_model = default_model or inference_settings.llm_default_model
        self.api_key = api_key or inference_settings.llm_api_key
        self.timeout = timeout or inference_settings.llm_request_timeout

    async def predict(
        self,
        prompt: str,
        model: str | None = None,
        system_prompt: str | None = None,
        messages: Sequence[dict[str, str]] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        """Sends chat completion request to vLLM Runtime Server Pool via HTTP REST API."""
        target_model = model or self.default_model
        endpoint = f"{self.base_url}/chat/completions"

        formatted_messages: list[dict[str, str]] = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})

        if messages:
            formatted_messages.extend(messages)
        else:
            formatted_messages.append({"role": "user", "content": prompt})

        payload = {
            "model": target_model,
            "messages": formatted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        logger.info(
            f"Dispatching inference to vLLM Pool ({endpoint}) | Model: {target_model}"
        )

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(endpoint, json=payload, headers=headers)
            response.raise_for_status()

            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                raise ValueError("Empty response choices from vLLM Runtime Server")

            content = choices[0].get("message", {}).get("content", "")
            return content
