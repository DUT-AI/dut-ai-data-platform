import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_uploads_endpoints(client: AsyncClient):
    """Verifies file uploading and presigned URL generation endpoints."""
    # 1. Register and Login to get auth token
    register_payload = {
        "email": "uploader@example.com",
        "password": "password123",
        "name": "Uploader",
    }
    await client.post("/api/v1/auth/register", json=register_payload)
    login_payload = {
        "email": "uploader@example.com",
        "password": "password123",
    }
    login_response = await client.post("/api/v1/auth/login", json=login_payload)
    token = login_response.cookies["access_token"]
    client.cookies.set("access_token", token)

    # 2. Test Presign Upload URL generation
    presign_payload = {
        "key": "avatars/my-avatar.jpg",
        "content_type": "image/jpeg",
    }
    response = await client.post("/api/v1/uploads/presign", json=presign_payload)
    assert response.status_code == 200
    data = response.json()
    assert "presigned_url" in data
    assert data["key"] == "avatars/my-avatar.jpg"
    assert "public_url" in data
    assert "mock-s3" in data["public_url"]

    # 3. Test Direct File Upload
    file_payload = {"file": ("test.txt", b"Hello S3 from test!", "text/plain")}
    response = await client.post("/api/v1/uploads/file", files=file_payload)
    assert response.status_code == 200
    data = response.json()
    assert "key" in data
    assert data["key"].startswith("uploads/")
    assert data["key"].endswith(".txt")
    assert "public_url" in data
    assert "mock-s3" in data["public_url"]
