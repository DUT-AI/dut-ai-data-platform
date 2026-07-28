import io
from typing import BinaryIO

import boto3
from botocore.client import Config
from domain.interfaces import IStorageProvider


class MinIOStorageAdapter(IStorageProvider):
    """S3/MinIO Storage Adapter implementing IStorageProvider."""

    def __init__(
        self,
        endpoint_url: str,
        access_key: str,
        secret_key: str,
        secure: bool = False,
        region_name: str = "us-east-1",
    ):
        self.endpoint_url = endpoint_url
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version="s3v4"),
            use_ssl=secure,
            region_name=region_name,
        )

    def _ensure_bucket(self, bucket: str) -> None:
        try:
            self.client.head_bucket(Bucket=bucket)
        except Exception:
            self.client.create_bucket(Bucket=bucket)

    async def upload(
        self, bucket: str, key: str, data: BinaryIO, content_type: str
    ) -> str:
        self._ensure_bucket(bucket)
        self.client.upload_fileobj(
            data,
            bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )
        return f"s3://{bucket}/{key}"

    async def download(self, bucket: str, key: str) -> bytes:
        buf = io.BytesIO()
        self.client.download_fileobj(bucket, key, buf)
        return buf.getvalue()

    async def delete(self, bucket: str, key: str) -> None:
        self.client.delete_object(Bucket=bucket, Key=key)

    async def get_presigned_url(
        self, bucket: str, key: str, expires: int = 3600
    ) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expires,
        )

    async def get_presigned_upload_url(
        self, bucket: str, key: str, content_type: str, expires: int = 3600
    ) -> str:
        return self.client.generate_presigned_url(
            "put_object",
            Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=expires,
            HttpMethod="PUT",
        )
