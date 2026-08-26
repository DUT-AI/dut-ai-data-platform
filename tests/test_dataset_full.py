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
async def test_dataset_full_lifecycle():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a Project
        p_res = await client.post(
            "/api/v1/projects",
            json={
                "name": "Dataset Test Project",
                "project_type": "detection",
            },
        )
        assert p_res.status_code == 201
        project_id = p_res.json()["id"]

        # 2. Create a Dataset
        d_res = await client.post(
            f"/api/v1/projects/{project_id}/datasets",
            json={
                "name": "COCO Vehicles Dataset 2026",
                "description": "Training dataset for vehicle detection models",
            },
        )
        assert d_res.status_code == 201
        dataset = d_res.json()
        assert dataset["name"] == "COCO Vehicles Dataset 2026"
        assert len(dataset["versions"]) == 1
        draft_ver_id = dataset["versions"][0]["id"]
        assert dataset["versions"][0]["version"] == "v1.0.0"
        assert dataset["versions"][0]["status"] == "draft"

        # 3. Batch Upload Files to Version
        file1_content = b"fake_png_image_binary_data_12345"
        file2_content = b"fake_pdf_document_binary_data_67890"

        files_data = [
            ("files", ("car_01.png", file1_content, "image/png")),
            ("files", ("doc_info.pdf", file2_content, "application/pdf")),
        ]

        upload_res = await client.post(
            f"/api/v1/dataset-versions/{draft_ver_id}/assets",
            files=files_data,
        )
        assert upload_res.status_code == 201
        upload_data = upload_res.json()
        assert upload_data["new_assets_count"] == 2
        assert upload_data["reused_assets_count"] == 0
        assert len(upload_data["uploaded_assets"]) == 2

        asset_1 = upload_data["uploaded_assets"][0]
        asset_2 = upload_data["uploaded_assets"][1]

        # 4. Verify SHA256 Deduplication: Upload file1_content again
        dup_files_data = [
            ("files", ("duplicate_car.png", file1_content, "image/png")),
        ]
        dup_upload_res = await client.post(
            f"/api/v1/dataset-versions/{draft_ver_id}/assets",
            files=dup_files_data,
        )
        assert dup_upload_res.status_code == 201
        dup_data = dup_upload_res.json()
        assert dup_data["reused_assets_count"] == 1
        assert dup_data["new_assets_count"] == 0
        assert dup_data["uploaded_assets"][0]["id"] == asset_1["id"]

        # 5. List Version Assets
        assets_res = await client.get(f"/api/v1/dataset-versions/{draft_ver_id}/assets")
        assert assets_res.status_code == 200
        version_assets = assets_res.json()
        assert len(version_assets) == 2

        # 6. Get Presigned Download URL
        download_res = await client.get(f"/api/v1/assets/{asset_1['id']}/download")
        assert download_res.status_code == 200
        download_data = download_res.json()
        assert download_data["asset_id"] == asset_1["id"]
        assert "download_url" in download_data

        # 7. Remove Asset from Version
        remove_res = await client.delete(
            f"/api/v1/dataset-versions/{draft_ver_id}/assets/{asset_2['id']}"
        )
        assert remove_res.status_code == 204

        # 8. Publish Dataset Version
        pub_res = await client.put(f"/api/v1/dataset-versions/{draft_ver_id}/publish")
        assert pub_res.status_code == 200
        published_ver = pub_res.json()
        assert published_ver["status"] == "published"
        assert published_ver["published_at"] is not None

        # 9. Verify Immutability: Attempting to upload to published version fails (400)
        failed_upload_res = await client.post(
            f"/api/v1/dataset-versions/{draft_ver_id}/assets",
            files=files_data,
        )
        assert failed_upload_res.status_code == 400
        assert "Only draft versions allow asset uploads" in failed_upload_res.json()[
            "error"
        ]["message"] or "Only draft versions allow asset uploads" in str(
            failed_upload_res.json()
        )
