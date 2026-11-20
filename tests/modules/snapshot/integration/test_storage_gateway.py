from unittest.mock import AsyncMock, MagicMock

import pytest

from core.storage.interface import IStorageProvider
from modules.snapshot.infrastructure.gateways.storage_gateway import (
    MinIOStorageGateway,
)


@pytest.mark.asyncio
async def test_storage_gateway_upload_and_delete():
    storage_provider = MagicMock(spec=IStorageProvider)
    storage_provider.upload = AsyncMock(
        return_value="/ai-data-platform/test/manifest.json"
    )
    storage_provider.delete = AsyncMock(return_value=None)

    gateway = MinIOStorageGateway(storage_provider)

    # 1. Test upload
    manifest_bytes = b'{"snapshot_id": "test-123"}'
    s3_uri = await gateway.upload_manifest(
        path="projects/p1/snapshots/s1/manifest.json",
        content=manifest_bytes,
    )

    assert s3_uri.startswith("s3://")
    assert "projects/p1/snapshots/s1/manifest.json" in s3_uri
    storage_provider.upload.assert_called_once()

    # 2. Test delete
    success = await gateway.delete_object(s3_uri)
    assert success is True
    storage_provider.delete.assert_called_once()
