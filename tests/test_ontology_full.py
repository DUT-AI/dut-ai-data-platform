import httpx
import pytest

from apps.api.deps import get_current_user
from apps.api.main import app
from modules.identity.domain.entities import AuthUser

OWNER = AuthUser(
    id=201,
    name="Ontology Owner",
    email="owner@dut.ai",
    status="ACTIVE",
    role_names=["USER"],
)
CATALOG_ADMIN = AuthUser(
    id=202,
    name="Ontology Catalog Admin",
    email="catalog-admin@dut.ai",
    status="ACTIVE",
    role_names=["admin"],
)


@pytest.fixture(autouse=True)
def override_auth_dep():
    app.dependency_overrides[get_current_user] = lambda: OWNER
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_ontology_nodes_version_publish_and_schema_export():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        project = (
            await client.post(
                "/api/v1/projects",
                json={"name": "Ontology Project", "project_type": "detection"},
            )
        ).json()
        project_id = project["id"]
        image_definition = next(
            item
            for item in (await client.get("/api/v1/ontology-definitions/inputs")).json()
            if item["code"] == "image"
        )
        bbox_definition = next(
            item
            for item in (
                await client.get("/api/v1/ontology-definitions/outputs")
            ).json()
            if item["code"] == "bounding_box"
        )

        response = await client.post(
            f"/api/v1/projects/{project_id}/ontologies", json={"name": "Xe cộ"}
        )
        assert response.status_code == 201, response.text
        ontology = response.json()
        ontology_id, version_id = ontology["id"], ontology["versions"][0]["id"]

        input_response = await client.post(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/inputs",
            json={
                "definition_id": image_definition["id"],
                "name": "Ảnh giao thông",
                "scope": "ONE_ITEM",
                "input_schema": {
                    "type": "image",
                    "allowed_extensions": ["png", "jpg"],
                    "item": None,
                },
            },
        )
        assert input_response.status_code == 201, input_response.text
        input_node = input_response.json()

        output_response = await client.post(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/outputs",
            json={
                "definition_id": bbox_definition["id"],
                "name": "Vùng xe",
                "multiple": True,
                "required": True,
            },
        )
        assert output_response.status_code == 201, output_response.text
        output_node = output_response.json()

        categories = []
        for key, name, color in (
            ("car", "Ô tô", "#2563EB"),
            ("bus", "Xe buýt", "#F97316"),
        ):
            item = await client.post(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/categories",
                json={"key": key, "name": name, "color": color},
            )
            assert item.status_code == 201, item.text
            categories.append(item.json())

        composed = await client.put(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions/{version_id}/composition",
            json={
                "inputs": [{"input_id": input_node["id"], "sort_order": 0}],
                "outputs": [
                    {
                        "output_id": output_node["id"],
                        "input_id": input_node["id"],
                        "category_ids": [item["id"] for item in categories],
                        "sort_order": 0,
                    }
                ],
            },
        )
        assert composed.status_code == 200, composed.text

        validation = await client.post(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions/{version_id}/validate"
        )
        assert validation.json() == {"valid": True, "issues": []}
        exported = await client.get(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions/{version_id}/schema"
        )
        assert exported.status_code == 200, exported.text
        assert exported.json()["inputs"][0]["schema"]["item"] is None
        assert exported.json()["outputs"][0]["input_id"] == input_node["id"]
        assert [
            item["key"] for item in exported.json()["outputs"][0]["categories"]
        ] == ["car", "bus"]

        published = await client.post(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions/{version_id}/publish"
        )
        assert published.status_code == 200, published.text
        assert published.json()["schema_hash"].startswith("sha256:")
        assert (
            await client.patch(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/inputs/{input_node['id']}",
                json={"name": "Không được sửa"},
            )
        ).status_code == 409

        draft_v2 = await client.post(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions",
            json={"name": "Xe cộ v2", "based_on_version_id": version_id},
        )
        assert draft_v2.status_code == 201, draft_v2.text
        draft_v2_id = draft_v2.json()["id"]
        assert len(draft_v2.json()["outputs"]) == 1
        renamed = await client.patch(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions/{draft_v2_id}",
            json={"name": "Xe cộ v2 đang chỉnh"},
        )
        assert renamed.status_code == 200, renamed.text
        assert renamed.json()["name"] == "Xe cộ v2 đang chỉnh"
        versions = await client.get(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions"
        )
        assert versions.status_code == 200
        assert {item["id"] for item in versions.json()} >= {version_id, draft_v2_id}
        assert (
            await client.delete(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions/{draft_v2_id}"
            )
        ).status_code == 204
        assert (
            await client.delete(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions/{version_id}"
            )
        ).status_code == 409
        assert (
            await client.delete(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}"
            )
        ).status_code == 409


@pytest.mark.asyncio
async def test_input_schema_validation_and_project_auth():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        assert (
            await client.get("/api/v1/projects/00000000000000000000000000/ontologies")
        ).status_code == 403
        project_id = (
            await client.post(
                "/api/v1/projects",
                json={"name": "Validation", "project_type": "detection"},
            )
        ).json()["id"]
        ontology = (
            await client.post(
                f"/api/v1/projects/{project_id}/ontologies", json={"name": "Schema"}
            )
        ).json()
        definition = next(
            item
            for item in (await client.get("/api/v1/ontology-definitions/inputs")).json()
            if item["code"] == "image"
        )
        invalid = await client.post(
            f"/api/v1/projects/{project_id}/ontologies/{ontology['id']}/inputs",
            json={
                "definition_id": definition["id"],
                "name": "Sai",
                "scope": "MANY_ITEMS",
                "input_schema": {
                    "type": "image",
                    "allowed_extensions": ["png"],
                    "item": None,
                },
            },
        )
        assert invalid.status_code == 422


@pytest.mark.asyncio
async def test_draft_node_crud_disconnects_wires_before_delete():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        project = await client.post(
            "/api/v1/projects",
            json={"name": "Draft CRUD", "project_type": "detection"},
        )
        project_id = project.json()["id"]
        ontology_response = await client.post(
            f"/api/v1/projects/{project_id}/ontologies",
            json={"name": "Ontology tạm"},
        )
        ontology = ontology_response.json()
        ontology_id = ontology["id"]
        version_id = ontology["versions"][0]["id"]
        image_definition = next(
            item
            for item in (await client.get("/api/v1/ontology-definitions/inputs")).json()
            if item["code"] == "image"
        )
        bbox_definition = next(
            item
            for item in (
                await client.get("/api/v1/ontology-definitions/outputs")
            ).json()
            if item["code"] == "bounding_box"
        )

        input_node = (
            await client.post(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/inputs",
                json={
                    "definition_id": image_definition["id"],
                    "name": "Ảnh gốc",
                    "scope": "ONE_ITEM",
                    "input_schema": {
                        "type": "image",
                        "allowed_extensions": ["png"],
                        "item": None,
                    },
                },
            )
        ).json()
        output_node = (
            await client.post(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/outputs",
                json={
                    "definition_id": bbox_definition["id"],
                    "name": "Vùng đối tượng",
                    "multiple": True,
                    "required": True,
                },
            )
        ).json()
        category = (
            await client.post(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/categories",
                json={"key": "vehicle", "name": "Phương tiện"},
            )
        ).json()

        assert (
            await client.patch(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/inputs/{input_node['id']}",
                json={"name": "Ảnh giao thông"},
            )
        ).json()["name"] == "Ảnh giao thông"
        assert (
            await client.patch(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/outputs/{output_node['id']}",
                json={"name": "Các vùng phương tiện"},
            )
        ).json()["name"] == "Các vùng phương tiện"
        category_update = await client.patch(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/categories/{category['id']}",
            json={"key": "road_vehicle", "name": "Phương tiện đường bộ"},
        )
        assert category_update.status_code == 200, category_update.text
        category = category_update.json()

        for collection, entity in (
            ("inputs", input_node),
            ("outputs", output_node),
            ("categories", category),
        ):
            detail = await client.get(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/{collection}/{entity['id']}"
            )
            assert detail.status_code == 200, detail.text
            listing = await client.get(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/{collection}"
            )
            assert entity["id"] in {item["id"] for item in listing.json()}

        composed = await client.put(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions/{version_id}/composition",
            json={
                "inputs": [{"input_id": input_node["id"]}],
                "outputs": [
                    {
                        "output_id": output_node["id"],
                        "input_id": input_node["id"],
                        "category_ids": [category["id"]],
                    }
                ],
            },
        )
        assert composed.status_code == 200, composed.text

        deleted_category = await client.delete(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/categories/{category['id']}"
        )
        assert deleted_category.status_code == 204, deleted_category.text
        after_category_delete = await client.get(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions/{version_id}"
        )
        assert after_category_delete.json()["outputs"][0]["categories"] == []

        assert (
            await client.delete(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/outputs/{output_node['id']}"
            )
        ).status_code == 204
        after_output_delete = await client.get(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions/{version_id}"
        )
        assert after_output_delete.json()["outputs"] == []

        assert (
            await client.delete(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/inputs/{input_node['id']}"
            )
        ).status_code == 204
        after_input_delete = await client.get(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions/{version_id}"
        )
        assert after_input_delete.json()["inputs"] == []

        assert (
            await client.patch(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}",
                json={"name": "Ontology đã đổi tên"},
            )
        ).json()["name"] == "Ontology đã đổi tên"
        assert (
            await client.delete(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions/{version_id}"
            )
        ).status_code == 204
        assert (
            await client.delete(
                f"/api/v1/projects/{project_id}/ontologies/{ontology_id}"
            )
        ).status_code == 204


@pytest.mark.asyncio
async def test_catalog_definition_crud_requires_system_admin():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        denied = await client.post(
            "/api/v1/ontology-definitions/inputs",
            json={
                "code": "temporary_binary",
                "name": "Temporary Binary",
                "allowed_formats": ["bin"],
            },
        )
        assert denied.status_code == 403

        app.dependency_overrides[get_current_user] = lambda: CATALOG_ADMIN
        input_created = await client.post(
            "/api/v1/ontology-definitions/inputs",
            json={
                "code": "temporary_binary",
                "name": "Temporary Binary",
                "allowed_formats": [".BIN", "dat"],
            },
        )
        assert input_created.status_code == 201, input_created.text
        input_definition = input_created.json()
        assert input_definition["allowed_formats"] == ["bin", "dat"]
        assert (
            await client.get(
                f"/api/v1/ontology-definitions/inputs/{input_definition['id']}"
            )
        ).status_code == 200
        input_updated = await client.patch(
            f"/api/v1/ontology-definitions/inputs/{input_definition['id']}",
            json={"name": "Binary file", "allowed_formats": ["raw"]},
        )
        assert input_updated.status_code == 200, input_updated.text
        assert input_updated.json()["allowed_formats"] == ["raw"]
        assert (
            await client.delete(
                f"/api/v1/ontology-definitions/inputs/{input_definition['id']}"
            )
        ).status_code == 204

        output_created = await client.post(
            "/api/v1/ontology-definitions/outputs",
            json={
                "code": "temporary_vector",
                "name": "Temporary Vector",
                "supports_categories": False,
                "default_schema": {"type": "array"},
            },
        )
        assert output_created.status_code == 201, output_created.text
        output_definition = output_created.json()
        assert (
            await client.get(
                f"/api/v1/ontology-definitions/outputs/{output_definition['id']}"
            )
        ).status_code == 200
        output_updated = await client.patch(
            f"/api/v1/ontology-definitions/outputs/{output_definition['id']}",
            json={
                "name": "Vector",
                "default_schema": {"type": "array", "items": {"type": "number"}},
            },
        )
        assert output_updated.status_code == 200, output_updated.text
        assert output_updated.json()["name"] == "Vector"
        assert (
            await client.delete(
                f"/api/v1/ontology-definitions/outputs/{output_definition['id']}"
            )
        ).status_code == 204


@pytest.mark.asyncio
async def test_vehicle_seed_is_idempotent_and_readable_through_api(
    test_session_factory,
):
    from apps.cli.seed_vehicle_ontology import seed_vehicle_ontology

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        project_id = (
            await client.post(
                "/api/v1/projects",
                json={"name": "Vehicle Seed", "project_type": "detection"},
            )
        ).json()["id"]
        async with test_session_factory() as session, session.begin():
            first = await seed_vehicle_ontology(session, project_id)
        async with test_session_factory() as session, session.begin():
            second = await seed_vehicle_ontology(session, project_id)
        assert first.created is True
        assert second.created is False
        assert second.ontology_id == first.ontology_id

        ontology = await client.get(
            f"/api/v1/projects/{project_id}/ontologies/{first.ontology_id}"
        )
        assert ontology.status_code == 200, ontology.text
        assert ontology.json()["current_version_id"] == first.version_id
        schema = await client.get(
            f"/api/v1/projects/{project_id}/ontologies/{first.ontology_id}/versions/{first.version_id}/schema"
        )
        assert schema.status_code == 200, schema.text
        assert schema.json()["inputs"][0]["schema"]["item"] is None
        assert [item["key"] for item in schema.json()["outputs"][0]["categories"]] == [
            "car",
            "motorcycle",
            "bus",
            "truck",
            "bicycle",
        ]
