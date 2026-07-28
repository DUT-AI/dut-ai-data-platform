from dishka import Provider, Scope, provide
from domain.interfaces import IStorageProvider
from infrastructure.storage import MinIOStorageAdapter

from app.config import settings


class StorageClientProvider(Provider):
    """Provider for S3/MinIO Storage Provider."""

    scope = Scope.APP

    @provide
    def get_storage_provider(self) -> IStorageProvider:
        return MinIOStorageAdapter(
            endpoint_url=settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
