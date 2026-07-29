import httpx
import pytest
from app.common.deps import get_current_user
from app.main import app
from domain.entities import ProjectMemberEntity


def mock_get_current_user():
    return ProjectMemberEntity(
        id="user_test_id",
        project_id="test_proj",
        user_id="user_test_id",
        role="owner",
        status="active",
    )


app.dependency_overrides[get_current_user] = mock_get_current_user


@pytest.mark.asyncio
async def test_annotation_full_lifecycle():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a Project
        p_res = await client.post(
            "/api/v1/projects",
            json={"name": "Annotation Test Project", "project_type": "detection"},
        )
        assert p_res.status_code == 201
        project_id = p_res.json()["id"]

        # 2. Create an Ontology Schema & Categories
        onto_res = await client.post(
            f"/api/v1/projects/{project_id}/ontologies",
            json={"name": "Detection Schema", "description": "Vehicle schema"},
        )
        assert onto_res.status_code == 201
        ontology_ver_id = onto_res.json()["versions"][0]["id"]

        cat_car_res = await client.post(
            f"/api/v1/ontology-versions/{ontology_ver_id}/categories",
            json={"name": "car", "display_name": "Car", "color": "#3B82F6"},
        )
        assert cat_car_res.status_code == 201
        car_cat_id = cat_car_res.json()["id"]

        cat_ped_res = await client.post(
            f"/api/v1/ontology-versions/{ontology_ver_id}/categories",
            json={
                "name": "pedestrian",
                "display_name": "Pedestrian",
                "color": "#EF4444",
            },
        )
        assert cat_ped_res.status_code == 201
        ped_cat_id = cat_ped_res.json()["id"]

        # 3. Create Dataset & Version
        d_res = await client.post(
            f"/api/v1/projects/{project_id}/datasets",
            json={"name": "Test Dataset", "description": "Asset dataset"},
        )
        assert d_res.status_code == 201
        draft_ver_id = d_res.json()["versions"][0]["id"]

        # 4. Upload an Asset
        files_data = [
            ("files", ("traffic_01.png", b"fake_png_data", "image/png")),
        ]
        upload_res = await client.post(
            f"/api/v1/dataset-versions/{draft_ver_id}/assets",
            files=files_data,
        )
        assert upload_res.status_code == 201
        asset_id = upload_res.json()["uploaded_assets"][0]["id"]

        # 5. Create Initial Annotation + Revision 1
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
                        "category_id": ped_cat_id,
                        "result_type": "polygon",
                        "geometry": {"points": [[5.0, 5.0], [15.0, 5.0], [10.0, 20.0]]},
                    },
                ],
            },
        )
        assert create_anno_res.status_code == 201
        anno_data = create_anno_res.json()
        anno_id = anno_data["id"]

        # 6. Fetch Annotation Detail
        detail_res = await client.get(f"/api/v1/annotations/{anno_id}")
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["asset_id"] == asset_id
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

        # 9. Test Label Studio Webhook Sync (passing category name "car")
        ls_webhook_payload = {
            "event": "ANNOTATION_CREATED",
            "task": {
                "data": {
                    "asset_id": asset_id,
                    "project_id": project_id,
                    "ontology_version_id": ontology_ver_id,
                }
            },
            "annotation": {
                "created_username": "annotator_john",
                "result": [
                    {
                        "type": "rectanglelabels",
                        "value": {
                            "x": 15.0,
                            "y": 25.0,
                            "width": 35.0,
                            "height": 45.0,
                            "rectanglelabels": ["car"],
                        },
                    }
                ],
            },
        }

        sync_res = await client.post(
            "/api/v1/annotations/sync",
            json=ls_webhook_payload,
        )
        assert sync_res.status_code == 200
        synced_rev = sync_res.json()
        assert synced_rev["revision_number"] == 3
        assert synced_rev["created_by"] == "annotator_john"
        assert len(synced_rev["results"]) == 1
        assert synced_rev["results"][0]["result_type"] == "bbox"
