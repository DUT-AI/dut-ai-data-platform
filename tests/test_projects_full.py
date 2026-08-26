import httpx
import pytest

from apps.api.deps import get_current_user
from apps.api.main import app
from modules.identity.domain.entities import AuthUser

mock_user = AuthUser(
    id=101,
    name="Test Owner",
    email="owner@dut.ai",
    status="ACTIVE",
    role_names=["USER"],
)


@pytest.fixture(autouse=True)
def override_auth_dep():
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_project_full_lifecycle():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create project
        create_res = await client.post(
            "/api/v1/projects",
            json={
                "name": "Integration Test Project",
                "description": "Project for full integration testing",
                "project_type": "detection",
            },
        )
        assert create_res.status_code == 201
        project = create_res.json()
        project_id = project["id"]
        assert project["name"] == "Integration Test Project"
        assert project["status"] == "active"
        assert project["owner_id"] == "101"

        # 2. Get project detail
        get_res = await client.get(f"/api/v1/projects/{project_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == project_id

        # 3. Update project
        update_res = await client.put(
            f"/api/v1/projects/{project_id}",
            json={
                "name": "Updated Project Name",
                "description": "Updated description",
            },
        )
        assert update_res.status_code == 200
        assert update_res.json()["name"] == "Updated Project Name"

        # 4. List members
        members_res = await client.get(f"/api/v1/projects/{project_id}/members")
        assert members_res.status_code == 200
        members = members_res.json()
        assert len(members) >= 1
        assert members[0]["role"] == "owner"

        # 5. Add member
        add_res = await client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"user_id": "102", "role": "annotator"},
        )
        assert add_res.status_code == 201
        assert add_res.json()["user_id"] == "102"
        assert add_res.json()["role"] == "annotator"

        # 6. Update member role
        update_member_res = await client.put(
            f"/api/v1/projects/{project_id}/members/102",
            json={"role": "reviewer"},
        )
        assert update_member_res.status_code == 200
        assert update_member_res.json()["role"] == "reviewer"

        # 7. Get & Update Project Config
        config_get = await client.get(f"/api/v1/projects/{project_id}/config")
        assert config_get.status_code == 200
        assert config_get.json()["settings"] == {}

        config_update = await client.put(
            f"/api/v1/projects/{project_id}/config",
            json={"auto_assign": True, "max_annotations_per_item": 3},
        )
        assert config_update.status_code == 200
        assert config_update.json()["settings"]["auto_assign"] is True

        # 8. Remove member
        remove_member_res = await client.delete(
            f"/api/v1/projects/{project_id}/members/102"
        )
        assert remove_member_res.status_code == 204

        # 9. Archive project
        archive_res = await client.delete(f"/api/v1/projects/{project_id}")
        assert archive_res.status_code == 200
        assert archive_res.json()["status"] == "archived"
