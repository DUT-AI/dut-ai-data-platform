from typing import Any

from modules.inference.domain.entities import PredictionResultEntity


class PredictionConverter:
    """Domain Service normalizing raw AI Model outputs to Internal Annotation Schema."""

    @staticmethod
    def to_internal_annotation_schema(
        job_id: str,
        asset_id: str | None,
        model_name: str,
        raw_response: str,
        latency_ms: float = 0.0,
        confidence: float = 1.0,
    ) -> dict[str, Any]:
        """Converts raw model response to standardized system annotation payload."""
        return {
            "job_id": job_id,
            "asset_id": asset_id,
            "model_name": model_name,
            "prediction": {
                "annotation_type": "text_generation",
                "schema_version": "1.0",
                "content": raw_response,
            },
            "confidence": confidence,
            "latency_ms": latency_ms,
        }

    @staticmethod
    def to_prediction_result_entity(
        job_id: str,
        asset_id: str | None,
        model_name: str,
        raw_response: str,
        result_id: str,
        latency_ms: float = 0.0,
    ) -> PredictionResultEntity:
        """Converts raw outputs to domain PredictionResultEntity."""
        schema_data = PredictionConverter.to_internal_annotation_schema(
            job_id=job_id,
            asset_id=asset_id,
            model_name=model_name,
            raw_response=raw_response,
            latency_ms=latency_ms,
        )
        return PredictionResultEntity(
            id=result_id,
            job_id=job_id,
            asset_id=asset_id,
            model_name=model_name,
            raw_response=raw_response,
            prediction=schema_data,
            confidence=1.0,
            latency_ms=latency_ms,
        )
