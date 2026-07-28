import io
from uuid import uuid4

from app.application.dtos.user import UploadOut
from app.config import settings
from app.domain.interfaces.s3_client import IS3Client
from fastapi import HTTPException


class UploadFileUseCase:
    """Use case to upload a file directly to S3/MinIO."""

    def __init__(self, s3_client: IS3Client) -> None:
        self._s3_client = s3_client

    async def execute(
        self, file_content: bytes, filename: str, content_type: str
    ) -> UploadOut:
        if (
            not settings.s3_access_key
            or not settings.s3_secret_key
            or not settings.s3_endpoint
        ):
            raise HTTPException(
                status_code=503, detail="S3/MinIO Storage service is not configured"
            )

        # Generate a unique key
        ext = filename.split(".")[-1] if "." in filename else "bin"
        key = f"uploads/{uuid4()}.{ext}"

        # Upload fileobj
        file_obj = io.BytesIO(file_content)
        self._s3_client.upload_fileobj(
            file_obj=file_obj,
            bucket=settings.s3_bucket_name,
            key=key,
        )

        public_url = self._s3_client.get_object_url(settings.s3_bucket_name, key)

        return UploadOut(
            key=key,
            public_url=public_url,
        )
