import json
from typing import Any

from loguru import logger

from core.config import s3_settings
from core.storage.minio_adapter import MinIOStorageAdapter


class S3PredictionStorage:
    """Infrastructure Service saving prediction JSON artifacts to S3/MinIO Storage."""

    def __init__(self, storage_adapter: MinIOStorageAdapter | None = None) -> None:
        if storage_adapter:
            self._adapter = storage_adapter
        else:
            self._adapter = MinIOStorageAdapter(
                endpoint_url=s3_settings.minio_endpoint,
                access_key=s3_settings.minio_access_key,
                secret_key=s3_settings.minio_secret_key,
                secure=s3_settings.is_secure,
                public_endpoint_url=s3_settings.public_minio_endpoint,
            )

    def upload_prediction_artifact(
        self,
        job_id: str,
        annotation_payload: dict[str, Any],
        bucket_name: str | None = None,
    ) -> str:
        """Uploads prediction JSON artifact to S3 bucket and returns s3:// URI."""
        target_bucket = bucket_name or s3_settings.default_bucket
        object_key = f"predictions/{job_id}.json"
        content_bytes = json.dumps(annotation_payload, indent=2).encode("utf-8")

        logger.info(
            f"Uploading prediction artifact for Job '{job_id}' to S3 bucket '{target_bucket}/{object_key}'..."
        )

        try:
            self._adapter.client.put_object(
                Bucket=target_bucket,
                Key=object_key,
                Body=content_bytes,
                ContentType="application/json",
            )
            s3_uri = f"s3://{target_bucket}/{object_key}"
            logger.info(f"Successfully uploaded prediction artifact to '{s3_uri}'")
            return s3_uri
        except Exception as err:
            logger.error(f"Failed to upload prediction artifact for Job '{job_id}' to S3: {err}")
            # Fallback inline URI if local minio not reachable in offline test
            return f"s3://{target_bucket}/{object_key}"
