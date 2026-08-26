from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from apps.api.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}


@patch("apps.api.main.check_database", new_callable=AsyncMock)
@patch("apps.api.main.check_redis", new_callable=AsyncMock)
@patch("apps.api.main.check_minio", new_callable=AsyncMock)
def test_readiness_check_success(mock_minio, mock_redis, mock_db):
    mock_db.return_value = (True, "ok")
    mock_redis.return_value = (True, "ok")
    mock_minio.return_value = (True, "ok")

    response = client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["services"] == {
        "database": "ok",
        "redis": "ok",
        "minio": "ok",
    }


@patch("apps.api.main.check_database", new_callable=AsyncMock)
@patch("apps.api.main.check_redis", new_callable=AsyncMock)
@patch("apps.api.main.check_minio", new_callable=AsyncMock)
def test_readiness_check_unhealthy(mock_minio, mock_redis, mock_db):
    mock_db.return_value = (True, "ok")
    mock_redis.return_value = (False, "error: connection failed")
    mock_minio.return_value = (True, "ok")

    response = client.get("/ready")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "unhealthy"
    assert data["services"]["redis"] == "error: connection failed"
