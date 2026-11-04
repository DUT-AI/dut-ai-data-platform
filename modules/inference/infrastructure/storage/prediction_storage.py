import io
import json
from typing import Any

from loguru import logger

from core.config import s3_settings
from core.exceptions import StorageUploadError
from core.storage.interface import IStorageProvider
from core.storage.minio_adapter import MinIOStorageAdapter


class S3PredictionStorage:
    """Infrastructure Service saving prediction JSON artifacts to S3/MinIO Storage via IStorageProvider."""

    def __init__(
        self,
        storage_provider: IStorageProvider | None = None,
        storage_adapter: MinIOStorageAdapter | None = None,
    ) -> None:
        if storage_provider is not None:
            self._storage_provider = storage_provider
        elif storage_adapter is not None:
            self._storage_provider = storage_adapter
        else:
            self._storage_provider = MinIOStorageAdapter(
                endpoint_url=s3_settings.minio_endpoint,
                access_key=s3_settings.minio_access_key,
                secret_key=s3_settings.minio_secret_key,
                secure=s3_settings.is_secure,
                public_endpoint_url=s3_settings.public_minio_endpoint,
            )

    async def upload_prediction_artifact(
        self,
        job_id: str,
        annotation_payload: dict[str, Any],
        bucket_name: str | None = None,
    ) -> str:
        """Uploads prediction JSON artifact to S3 bucket via IStorageProvider and returns s3:// URI."""
        target_bucket = bucket_name or s3_settings.default_bucket
        object_key = f"predictions/{job_id}.json"
        content_bytes = json.dumps(annotation_payload, indent=2).encode("utf-8")
        data_stream = io.BytesIO(content_bytes)

        logger.info(
            f"Uploading prediction artifact for Job '{job_id}' to S3 bucket '{target_bucket}/{object_key}'..."
        )

        try:
            await self._storage_provider.upload(
                bucket=target_bucket,
                key=object_key,
                data=data_stream,
                content_type="application/json",
            )
            s3_uri = f"s3://{target_bucket}/{object_key}"
            logger.info(f"Successfully uploaded prediction artifact to '{s3_uri}'")
            return s3_uri
        except Exception as err:
            logger.error(
                f"Failed to upload prediction artifact for Job '{job_id}' to S3: {err}"
            )
            raise StorageUploadError(
                f"Failed to upload prediction artifact for Job '{job_id}' to S3: {err}"
            ) from err
