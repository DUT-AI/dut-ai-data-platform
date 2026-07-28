import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_flow(client: AsyncClient):
    """Verifies user registration, login, profile retrieval, profile updates, and logout."""
    # 1. Register a new user
    register_payload = {
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User",
    }
    response = await client.post("/api/v1/auth/register", json=register_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert "id" in data

    # 2. Register again with same email should fail (Conflict)
    response = await client.post("/api/v1/auth/register", json=register_payload)
    assert response.status_code == 409
    assert "đã được đăng ký" in response.json()["detail"]

    # 3. Login with invalid password
    login_payload_invalid = {
        "email": "test@example.com",
        "password": "wrongpassword",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload_invalid)
    assert response.status_code == 401

    # 4. Login with correct password
    login_payload = {
        "email": "test@example.com",
        "password": "password123",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    login_data = response.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"

    # Verify cookie was set
    assert "access_token" in response.cookies
    token = response.cookies["access_token"]

    # 5. Get profile (Unauthenticated)
    # Clear client cookies first
    client.cookies.clear()
    response = await client.get("/api/v1/me")
    assert response.status_code == 401

    # 6. Get profile (Authenticated with header)
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/v1/me", headers=headers)
    assert response.status_code == 200
    profile_data = response.json()
    assert profile_data["email"] == "test@example.com"
    assert profile_data["name"] == "Test User"

    # 7. Get profile (Authenticated with cookie)
    client.cookies.set("access_token", token)
    response = await client.get("/api/v1/me")
    assert response.status_code == 200
    profile_data = response.json()
    assert profile_data["email"] == "test@example.com"

    # 8. Update profile
    update_payload = {
        "name": "Updated Name",
        "avatar_url": "http://avatar.com/123.png",
    }
    response = await client.put("/api/v1/me", json=update_payload)
    assert response.status_code == 200
    updated_data = response.json()
    assert updated_data["name"] == "Updated Name"
    assert updated_data["avatar_url"] == "http://avatar.com/123.png"

    # 9. Logout
    response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert "access_token" not in response.cookies
