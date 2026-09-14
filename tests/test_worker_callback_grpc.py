from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from apps.ai_worker.be_grpc_client import BEWorkerCallbackClient
from apps.api.grpc_server import WorkerCallbackServicer, start_be_grpc_server
from modules.inference.domain.services.converter import PredictionConverter
from modules.inference.infrastructure.storage.prediction_storage import S3PredictionStorage


def test_prediction_converter_internal_schema():
    payload = PredictionConverter.to_internal_annotation_schema(
        job_id="job_001",
        asset_id="asset_001",
        model_name="ggml-org/gemma-4-e4b-it-GGUF:Q4_0",
        raw_response="Gemma output text",
        latency_ms=123.4,
    )

    assert payload["job_id"] == "job_001"
    assert payload["asset_id"] == "asset_001"
    assert payload["model_name"] == "ggml-org/gemma-4-e4b-it-GGUF:Q4_0"
    assert payload["prediction"]["content"] == "Gemma output text"
    assert payload["prediction"]["annotation_type"] == "text_generation"
    assert payload["latency_ms"] == 123.4


def test_s3_prediction_storage_upload_bytes():
    mock_adapter = MagicMock()
    storage = S3PredictionStorage(storage_adapter=mock_adapter)

    payload = {"prediction": "data"}
    s3_uri = storage.upload_prediction_artifact(
        job_id="job_002",
        annotation_payload=payload,
        bucket_name="data-platform",
    )

    assert s3_uri == "s3://data-platform/predictions/job_002.json"
    mock_adapter.client.put_object.assert_called_once()


@pytest.mark.asyncio
async def test_be_server_grpc_servicer_and_client_callback():
    servicer = WorkerCallbackServicer()
    payload_bytes = b'{"job_id": "job_003", "model_name": "gemma", "storage_uri": "s3://test/job_003.json"}'

    response_bytes = await servicer.SubmitPredictionResult(payload_bytes, None)
    assert b"success" in response_bytes
    assert b"job_003" in response_bytes


@pytest.mark.asyncio
@patch("grpc.aio.insecure_channel")
async def test_be_worker_callback_client_submit(mock_insecure_channel):
    mock_channel = MagicMock()
    mock_insecure_channel.return_value.__aenter__.return_value = mock_channel

    mock_unary = AsyncMock(return_value=b'{"success": true}')
    mock_channel.unary_unary.return_value = mock_unary

    client = BEWorkerCallbackClient(target_host="localhost", target_port=50052)
    success = await client.submit_prediction_result(
        job_id="job_004",
        asset_id="asset_004",
        model_name="gemma",
        internal_annotation_schema={"content": "test"},
        storage_uri="s3://data/predictions/job_004.json",
        latency_ms=100.0,
    )

    assert success is True
    mock_channel.unary_unary.assert_called_once_with(
        "/inference.WorkerCallbackService/SubmitPredictionResult"
    )
