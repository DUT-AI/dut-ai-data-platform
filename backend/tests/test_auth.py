import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """Verify backend health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_readiness_endpoint(client: AsyncClient):
    """Verify backend readiness check endpoint."""
    response = await client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


@pytest.mark.asyncio
async def test_logout_endpoint(client: AsyncClient):
    """Verify backend logout endpoint clears cookie."""
    response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json() == {"message": "Logout successful"}
