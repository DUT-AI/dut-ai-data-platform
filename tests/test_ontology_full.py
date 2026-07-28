import httpx
import pytest
from app.common.deps import get_current_user
from app.main import app
from shared.auth import AuthUser

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
async def test_ontology_full_lifecycle():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a project
        p_res = await client.post(
            "/api/v1/projects",
            json={
                "name": "Ontology Test Project",
                "project_type": "detection",
            },
        )
        assert p_res.status_code == 201
        project_id = p_res.json()["id"]

        # 2. Create an Ontology
        onto_res = await client.post(
            f"/api/v1/projects/{project_id}/ontologies",
            json={
                "name": "Vehicle Label Schema",
                "description": "Ontology schema for vehicles detection",
            },
        )
        assert onto_res.status_code == 201
        ontology = onto_res.json()
        assert ontology["name"] == "Vehicle Label Schema"
        assert len(ontology["versions"]) == 1
        draft_version_id = ontology["versions"][0]["id"]
        assert ontology["versions"][0]["version"] == "v1.0.0"
        assert ontology["versions"][0]["status"] == "draft"

        # 3. Add Category to Draft Version
        cat_res = await client.post(
            f"/api/v1/ontology-versions/{draft_version_id}/categories",
            json={
                "name": "car",
                "display_name": "Ô tô",
                "color": "#EF4444",
                "description": "Category for 4-wheeled vehicles",
            },
        )
        assert cat_res.status_code == 201
        category = cat_res.json()
        category_id = category["id"]
        assert category["name"] == "car"
        assert category["color"] == "#EF4444"

        # 4. Add Attribute to Category
        attr_res = await client.post(
            f"/api/v1/categories/{category_id}/attributes",
            json={
                "name": "fuel_type",
                "display_name": "Loại nhiên liệu",
                "type": "enum",
                "required": True,
                "allowed_values": ["Gasoline", "Diesel", "Electric", "Hybrid"],
                "default_value": "Gasoline",
            },
        )
        assert attr_res.status_code == 201
        attr = attr_res.json()
        assert attr["name"] == "fuel_type"
        assert attr["type"] == "enum"
        assert attr["allowed_values"] == ["Gasoline", "Diesel", "Electric", "Hybrid"]

        # 5. Get Version Detail
        ver_detail_res = await client.get(
            f"/api/v1/ontology-versions/{draft_version_id}"
        )
        assert ver_detail_res.status_code == 200
        ver_detail = ver_detail_res.json()
        assert len(ver_detail["categories"]) == 1
        assert len(ver_detail["categories"][0]["attributes"]) == 1

        # 6. Publish Version
        pub_res = await client.put(
            f"/api/v1/ontology-versions/{draft_version_id}/publish"
        )
        assert pub_res.status_code == 200
        published_ver = pub_res.json()
        assert published_ver["status"] == "published"
        assert published_ver["published_at"] is not None

        # 7. Attempt to add Category to Published Version (Expect 400 Bad Request)
        bad_cat_res = await client.post(
            f"/api/v1/ontology-versions/{draft_version_id}/categories",
            json={"name": "bus", "display_name": "Xe buýt", "color": "#10B981"},
        )
        assert bad_cat_res.status_code == 400

        # 8. Clone Published Version into a new Draft Version v1.1.0
        clone_res = await client.post(
            f"/api/v1/ontology-versions/{draft_version_id}/clone",
            json={"version": "v1.1.0"},
        )
        assert clone_res.status_code == 201
        cloned_ver = clone_res.json()
        cloned_version_id = cloned_ver["id"]
        assert cloned_ver["version"] == "v1.1.0"
        assert cloned_ver["status"] == "draft"
        assert len(cloned_ver["categories"]) == 1
        assert len(cloned_ver["categories"][0]["attributes"]) == 1

        # 9. Add new Category to the Cloned Draft Version
        cat2_res = await client.post(
            f"/api/v1/ontology-versions/{cloned_version_id}/categories",
            json={"name": "truck", "display_name": "Xe tải", "color": "#F59E0B"},
        )
        assert cat2_res.status_code == 201
        assert cat2_res.json()["name"] == "truck"
