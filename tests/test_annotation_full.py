import io

import httpx
import pytest
from PIL import Image

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
async def test_annotation_full_lifecycle():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a Project
        p_res = await client.post(
            "/api/v1/projects",
            json={
                "name": "Annotation Test Project",
                "project_type": "detection",
            },
        )
        assert p_res.status_code == 201
        project_id = p_res.json()["id"]

        # 2. Build and publish an Ontology using the current node-composition API.
        onto_res = await client.post(
            f"/api/v1/projects/{project_id}/ontologies",
            json={
                "name": "Detection Schema",
                "description": "Vehicle schema",
            },
        )
        assert onto_res.status_code == 201
        ontology = onto_res.json()
        ontology_id = ontology["id"]
        ontology_ver_id = ontology["versions"][0]["id"]

        input_definitions = (
            await client.get("/api/v1/ontology-definitions/inputs")
        ).json()
        output_definitions = (
            await client.get("/api/v1/ontology-definitions/outputs")
        ).json()
        image_definition_id = next(
            item["id"] for item in input_definitions if item["code"] == "image"
        )
        bbox_definition_id = next(
            item["id"] for item in output_definitions if item["code"] == "bounding_box"
        )

        input_res = await client.post(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/inputs",
            json={
                "definition_id": image_definition_id,
                "name": "Traffic image",
                "scope": "ONE_ITEM",
                "input_schema": {
                    "type": "image",
                    "allowed_extensions": ["png", "jpg"],
                    "item": None,
                },
            },
        )
        assert input_res.status_code == 201, input_res.text
        input_id = input_res.json()["id"]

        output_res = await client.post(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/outputs",
            json={
                "definition_id": bbox_definition_id,
                "name": "Detected objects",
                "multiple": True,
                "required": True,
            },
        )
        assert output_res.status_code == 201, output_res.text
        output_id = output_res.json()["id"]

        cat_car_res = await client.post(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/categories",
            json={"key": "car", "name": "Car", "color": "#3B82F6"},
        )
        assert cat_car_res.status_code == 201
        car_cat_id = cat_car_res.json()["id"]

        cat_ped_res = await client.post(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/categories",
            json={
                "key": "pedestrian",
                "name": "Pedestrian",
                "color": "#EF4444",
            },
        )
        assert cat_ped_res.status_code == 201
        ped_cat_id = cat_ped_res.json()["id"]

        compose_res = await client.put(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions/{ontology_ver_id}/composition",
            json={
                "inputs": [{"input_id": input_id, "sort_order": 0}],
                "outputs": [
                    {
                        "output_id": output_id,
                        "input_id": input_id,
                        "category_ids": [car_cat_id, ped_cat_id],
                        "sort_order": 0,
                    }
                ],
            },
        )
        assert compose_res.status_code == 200, compose_res.text
        publish_res = await client.post(
            f"/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions/{ontology_ver_id}/publish"
        )
        assert publish_res.status_code == 200, publish_res.text

        # 3. Create Dataset & Version
        d_res = await client.post(
            f"/api/v1/projects/{project_id}/datasets",
            json={"name": "Test Dataset", "description": "Asset dataset"},
        )
        assert d_res.status_code == 201
        draft_ver_id = d_res.json()["versions"][0]["id"]

        # 4. Upload an Asset
        buf = io.BytesIO()
        Image.new("RGB", (10, 10), "red").save(buf, format="PNG")
        valid_png_content = buf.getvalue()

        files_data = [
            ("files", ("traffic_01.png", valid_png_content, "image/png")),
        ]
        upload_res = await client.post(
            f"/api/v1/dataset-versions/{draft_ver_id}/assets",
            files=files_data,
        )
        assert upload_res.status_code == 201
        asset_id = upload_res.json()["uploaded_assets"][0]["id"]

        # 5a. Results that break the Ontology contract are rejected with every
        #     issue listed, and nothing is persisted.
        rejected_res = await client.post(
            "/api/v1/annotations",
            json={
                "asset_id": asset_id,
                "project_id": project_id,
                "ontology_version_id": ontology_ver_id,
                "source": "human",
                "results": [
                    {
                        # The version only defines a Bounding Box output.
                        "category_id": ped_cat_id,
                        "result_type": "polygon",
                        "geometry": {"points": [[5.0, 5.0], [15.0, 5.0], [10.0, 20.0]]},
                    },
                    {
                        "category_id": "cat_not_in_ontology",
                        "result_type": "bbox",
                        "geometry": {"x": 1.0, "y": 2.0, "width": 3.0, "height": 4.0},
                    },
                ],
            },
        )
        assert rejected_res.status_code == 400, rejected_res.text
        rejected_error = rejected_res.json()["error"]
        assert rejected_error["code"] == "AnnotationValidationError"
        assert [issue["code"] for issue in rejected_error["details"]["issues"]] == [
            "unknown_output",
            "category_not_allowed",
        ]
        assert (await client.get(f"/api/v1/assets/{asset_id}/annotations")).json() == []

        # 5b. A version id of another (unknown) project is reported as not found.
        foreign_res = await client.post(
            "/api/v1/annotations",
            json={
                "asset_id": asset_id,
                "project_id": "prj_other_project",
                "ontology_version_id": ontology_ver_id,
                "results": [],
            },
        )
        assert foreign_res.status_code == 404, foreign_res.text

        # 5c. Create Initial Annotation + Revision 1
        create_anno_res = await client.post(
            "/api/v1/annotations",
            json={
                "asset_id": asset_id,
                "project_id": project_id,
                "ontology_version_id": ontology_ver_id,
                "source": "human",
                "results": [
                    {
                        "category_id": car_cat_id,
                        "result_type": "bbox",
                        "geometry": {
                            "x": 10.0,
                            "y": 20.0,
                            "width": 30.0,
                            "height": 40.0,
                        },
                    },
                    {
                        "output_id": output_id,
                        "category_id": ped_cat_id,
                        "result_type": "bbox",
                        "geometry": {"x": 5.0, "y": 5.0, "width": 10.0, "height": 15.0},
                    },
                ],
            },
        )
        assert create_anno_res.status_code == 201, create_anno_res.text
        anno_data = create_anno_res.json()
        anno_id = anno_data["id"]
        assert sorted(anno_data["latest_revision"]["category_ids"]) == sorted(
            [car_cat_id, ped_cat_id]
        )

        # 6. Fetch Annotation Detail
        detail_res = await client.get(f"/api/v1/annotations/{anno_id}")
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["asset_id"] == asset_id
        assert detail_data["target_type"] == "FULL_ASSET"
        assert len(detail_data["revisions"]) == 1
        assert detail_data["revisions"][0]["revision_number"] == 1
        assert len(detail_data["revisions"][0]["results"]) == 2

        # 7. Create Revision 2 (Update/Fix Annotation)
        rev2_res = await client.post(
            f"/api/v1/annotations/{anno_id}/revisions",
            json={
                "source": "human",
                "results": [
                    {
                        "category_id": car_cat_id,
                        "result_type": "bbox",
                        "geometry": {
                            "x": 12.0,
                            "y": 22.0,
                            "width": 32.0,
                            "height": 42.0,
                        },
                    }
                ],
            },
        )
        assert rev2_res.status_code == 201
        rev2_data = rev2_res.json()
        assert rev2_data["revision_number"] == 2
        assert len(rev2_data["results"]) == 1

        # 8. List Revisions History
        revs_res = await client.get(f"/api/v1/annotations/{anno_id}/revisions")
        assert revs_res.status_code == 200
        revisions_list = revs_res.json()
        assert len(revisions_list) == 2
        assert revisions_list[0]["revision_number"] == 2
        assert revisions_list[1]["revision_number"] == 1

@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("path", "expected_status"),
    [
        ("/api/v1/assets/{asset_id}/open-in-label-studio", 404),
        # The remaining GET /annotations/{annotation_id} route matches this URL.
        ("/api/v1/annotations/sync", 405),
    ],
)
async def test_external_annotation_endpoints_removed(path, expected_status):
    assert path not in app.openapi()["paths"]
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(path.format(asset_id="retired-asset"), json={})
    assert response.status_code == expected_status
