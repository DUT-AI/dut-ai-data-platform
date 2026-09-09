from pydantic import BaseModel, Field


class InferenceRequestDTO(BaseModel):
    """Input DTO for requesting AI model inference."""

    prompt: str = Field(..., description="User query or input text for model inference")
    model: str | None = Field(
        default=None,
        description="Target model ID. Defaults to ggml-org/gemma-4-e4b-it-GGUF:Q4_0",
    )
    system_prompt: str | None = Field(default=None, description="System instruction")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=8192)


class PredictionResponseDTO(BaseModel):
    """Output DTO returning inference results."""

    job_id: str
    model_name: str
    content: str
    latency_ms: float
    status: str = "COMPLETED"
