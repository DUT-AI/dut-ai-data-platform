from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class InferenceSettings(BaseSettings):
    """AI Model Inference & vLLM Runtime Settings."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    inference_protocol: str = "http"  # "http" or "grpc"
    llm_api_base_url: str = "https://llm2.dutai.site/v1"
    llm_default_model: str = "ggml-org/gemma-4-e4b-it-GGUF:Q4_0"
    llm_api_key: str = "no-need"
    llm_request_timeout: float = 60.0

    grpc_runtime_host: str = "localhost"
    grpc_runtime_port: int = 50051
