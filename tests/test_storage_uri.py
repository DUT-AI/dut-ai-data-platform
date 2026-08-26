from unittest.mock import MagicMock

import pytest

from core.config import db_settings, redis_settings, s3_settings
from core.storage.minio_adapter import MinIOStorageAdapter
from core.storage.url_builder import (
    build_storage_public_url,
    parse_storage_uri,
)
from modules.dataset.domain.entities import AssetEntity
from modules.dataset.dtos.dataset_dtos import AssetResponseDTO


def test_build_storage_public_url():
    base = "https://dataplatforms3.dutai.io.vn"

    # Leading slash path with bucket
    res1 = build_storage_public_url(
        "/ai-data-platform/project-01KYMVXAFWSPFZ10D5RQZ4EFAZ/assets/01KYMVXBACFGPV70TZDB7VYNVR/car_01.png",
        base,
    )
    assert (
        res1
        == "https://dataplatforms3.dutai.io.vn/ai-data-platform/project-01KYMVXAFWSPFZ10D5RQZ4EFAZ/assets/01KYMVXBACFGPV70TZDB7VYNVR/car_01.png"
    )

    # Relative path without leading slash
    res2 = build_storage_public_url(
        "ai-data-platform/project-01KYMVXAFWSPFZ10D5RQZ4EFAZ/assets/01KYMVXBACFGPV70TZDB7VYNVR/car_01.png",
        base,
    )
    assert (
        res2
        == "https://dataplatforms3.dutai.io.vn/ai-data-platform/project-01KYMVXAFWSPFZ10D5RQZ4EFAZ/assets/01KYMVXBACFGPV70TZDB7VYNVR/car_01.png"
    )

    # Legacy s3:// format
    res3 = build_storage_public_url(
        "s3://ai-data-platform/project-01KYMVXAFWSPFZ10D5RQZ4EFAZ/assets/01KYMVXBACFGPV70TZDB7VYNVR/car_01.png",
        base,
    )
    assert (
        res3
        == "https://dataplatforms3.dutai.io.vn/ai-data-platform/project-01KYMVXAFWSPFZ10D5RQZ4EFAZ/assets/01KYMVXBACFGPV70TZDB7VYNVR/car_01.png"
    )

    # Already absolute HTTP/HTTPS URL
    res4 = build_storage_public_url(
        "https://cdn.example.com/images/car.png",
        base,
    )
    assert res4 == "https://cdn.example.com/images/car.png"

    # Relative path without bucket specified, with bucket param
    res5 = build_storage_public_url(
        "project-01KYMVXAFWSPFZ10D5RQZ4EFAZ/assets/01KYMVXBACFGPV70TZDB7VYNVR/car_01.png",
        base,
        bucket="ai-data-platform",
    )
    assert (
        res5
        == "https://dataplatforms3.dutai.io.vn/ai-data-platform/project-01KYMVXAFWSPFZ10D5RQZ4EFAZ/assets/01KYMVXBACFGPV70TZDB7VYNVR/car_01.png"
    )


def test_parse_storage_uri():
    bucket, key = parse_storage_uri(
        "/ai-data-platform/project-1/assets/2/car.png",
        default_bucket="ai-data-platform",
    )
    assert bucket == "ai-data-platform"
    assert key == "project-1/assets/2/car.png"

    bucket2, key2 = parse_storage_uri(
        "s3://ai-data-platform/project-1/assets/2/car.png",
        default_bucket="ai-data-platform",
    )
    assert bucket2 == "ai-data-platform"
    assert key2 == "project-1/assets/2/car.png"


def test_asset_response_dto_resolves_full_uri():
    entity = AssetEntity(
        id="01KYMVXBACFGPV70TZDB7VYNVR",
        project_id="01KYMVXAFWSPFZ10D5RQZ4EFAZ",
        filename="car_01.png",
        uri="/ai-data-platform/project-01KYMVXAFWSPFZ10D5RQZ4EFAZ/assets/01KYMVXBACFGPV70TZDB7VYNVR/car_01.png",
        mime_type="image/png",
        file_size=1024,
        sha256="abc123hash",
    )

    dto = AssetResponseDTO.model_validate(entity)
    endpoint = s3_settings.public_minio_endpoint
    expected_uri = f"{endpoint}/ai-data-platform/project-01KYMVXAFWSPFZ10D5RQZ4EFAZ/assets/01KYMVXBACFGPV70TZDB7VYNVR/car_01.png"
    assert dto.uri == expected_uri


@pytest.mark.asyncio
async def test_minio_storage_adapter_upload_and_build_url():
    adapter = MinIOStorageAdapter(
        endpoint_url="https://dataplatforms3.dutai.io.vn",
        access_key="dutai",
        secret_key="dutai123",
        secure=True,
    )
    adapter.client = MagicMock()

    url = adapter.build_public_url(
        "/ai-data-platform/project-01KYMVXAFWSPFZ10D5RQZ4EFAZ/assets/01KYMVXBACFGPV70TZDB7VYNVR/car_01.png"
    )
    assert (
        url
        == "https://dataplatforms3.dutai.io.vn/ai-data-platform/project-01KYMVXAFWSPFZ10D5RQZ4EFAZ/assets/01KYMVXBACFGPV70TZDB7VYNVR/car_01.png"
    )


def test_s3_settings_configuration():
    from core.config import S3Settings

    s3 = S3Settings()
    assert s3.minio_endpoint.startswith("http")
    assert s3.default_bucket == "ai-data-platform"
    assert s3.public_minio_endpoint.startswith("http")
    assert s3_settings.default_bucket == "ai-data-platform"


def test_database_and_redis_settings_configuration():
    from core.config import (
        DatabaseSettings,
        RedisSettings,
    )

    db = DatabaseSettings()
    assert db.database_url.startswith("postgresql+asyncpg://")
    assert db.url == db.database_url
    assert db_settings.database_url.startswith("postgresql+asyncpg://")

    redis = RedisSettings()
    assert redis.redis_url.startswith("redis://")
    assert redis.url == redis.redis_url
    assert redis_settings.redis_url.startswith("redis://")
