"""Unit tests for S3PredictionStorage error propagation and dependency inversion (User Story 3)."""

import io
import json
import pytest
from unittest.mock import AsyncMock

from core.exceptions import StorageUploadError
from core.storage.interface import IStorageProvider
from modules.inference.infrastructure.storage.prediction_storage import S3PredictionStorage


@pytest.mark.asyncio
async def test_s3_prediction_storage_successful_upload():
    """Verify S3PredictionStorage calls IStorageProvider.upload and returns s3:// URI."""
    storage_mock = AsyncMock(spec=IStorageProvider)
    storage_mock.upload.return_value = "/ai-data-platform/predictions/job_123.json"

    storage_service = S3PredictionStorage(storage_provider=storage_mock)
    payload = {"detections": [{"class": "car", "confidence": 0.95}]}

    result = await storage_service.upload_prediction_artifact(
        job_id="job_123",
        annotation_payload=payload,
        bucket_name="custom-bucket",
    )

    assert result == "s3://custom-bucket/predictions/job_123.json"
    storage_mock.upload.assert_awaited_once()
    call_args = storage_mock.upload.call_args
    assert call_args.kwargs["bucket"] == "custom-bucket"
    assert call_args.kwargs["key"] == "predictions/job_123.json"
    assert call_args.kwargs["content_type"] == "application/json"


@pytest.mark.asyncio
async def test_s3_prediction_storage_raises_storage_upload_error_on_failure():
    """Verify S3PredictionStorage raises StorageUploadError without returning fake fallback URIs."""
    storage_mock = AsyncMock(spec=IStorageProvider)
    storage_mock.upload.side_effect = ConnectionError("MinIO cluster unreachable")

    storage_service = S3PredictionStorage(storage_provider=storage_mock)
    payload = {"detections": []}

    with pytest.raises(StorageUploadError) as exc_info:
        await storage_service.upload_prediction_artifact(
            job_id="job_failed_999",
            annotation_payload=payload,
            bucket_name="ai-data-platform",
        )

    assert "job_failed_999" in str(exc_info.value)
    assert "MinIO cluster unreachable" in str(exc_info.value)

