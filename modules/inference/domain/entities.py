from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class InferenceJobEntity:
    """Domain Entity representing an Inference Job."""

    id: str
    project_id: str
    model_name: str
    status: str = "PENDING"  # PENDING, PROCESSING, COMPLETED, FAILED
    input_payload: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class PredictionResultEntity:
    """Domain Entity representing the normalized prediction result."""

    id: str
    job_id: str
    asset_id: str | None
    model_name: str
    raw_response: str
    prediction: dict[str, Any]
    confidence: float = 1.0
    latency_ms: float = 0.0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
