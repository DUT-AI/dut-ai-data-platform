from typing import Protocol, Sequence


class IRuntimeClient(Protocol):
    """Abstract protocol for AI Runtime Server clients (vLLM, Transformers, Triton)."""

    async def predict(
        self,
        prompt: str,
        model: str | None = None,
        system_prompt: str | None = None,
        messages: Sequence[dict[str, str]] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        """Sends an inference request to the runtime pool and returns text content."""
        ...
