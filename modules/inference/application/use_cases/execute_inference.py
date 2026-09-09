import time
from ulid import ULID

from core.config import inference_settings
from modules.inference.application.dtos import InferenceRequestDTO, PredictionResponseDTO
from modules.inference.domain.interfaces import IRuntimeClient


class ExecuteInferenceUseCase:
    """Use Case executing AI model inference via the registered Runtime Client."""

    def __init__(self, runtime_client: IRuntimeClient) -> None:
        self._runtime_client = runtime_client

    async def execute(self, payload: InferenceRequestDTO) -> PredictionResponseDTO:
        start_time = time.perf_counter()
        target_model = payload.model or inference_settings.llm_default_model
        job_id = str(ULID())

        content = await self._runtime_client.predict(
            prompt=payload.prompt,
            model=target_model,
            system_prompt=payload.system_prompt,
            temperature=payload.temperature,
            max_tokens=payload.max_tokens,
        )

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return PredictionResponseDTO(
            job_id=job_id,
            model_name=target_model,
            content=content,
            latency_ms=latency_ms,
            status="COMPLETED",
        )
