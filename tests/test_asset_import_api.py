"""End-to-end through the API: presigned upload -> 202 -> worker -> job status."""

import hashlib
import io

import httpx
import pytest
import pytest_asyncio
from PIL import Image

from apps.api.deps import get_current_user
from apps.api.main import app
from core.config import s3_settings
from core.storage.interface import IStorageProvider
from modules.identity.domain.entities import AuthUser

OWNER, OUTSIDER = 501, 502


class _Who:
    user_id = OWNER


who = _Who()


def _user() -> AuthUser:
    return AuthUser(
        id=who.user_id, name="u", email=f"u{who.user_id}@dut.ai", status="ACTIVE", role_names=[]
    )


@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = _user
    yield
    app.dependency_overrides.clear()
    who.user_id = OWNER


@pytest_asyncio.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def version_id(client) -> str:
    who.user_id = OWNER
    project = await client.post(
        "/api/v1/projects", json={"name": "Import API", "project_type": "detection"}
    )
    dataset = await client.post(
        f"/api/v1/projects/{project.json()['id']}/datasets", json={"name": "ds"}
    )
    return dataset.json()["versions"][0]["id"]


async def _storage() -> IStorageProvider:
    return await app.state.dishka_container.get(IStorageProvider)


def _png(color: str) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (6, 6), color).save(buf, format="PNG")
    return buf.getvalue()


async def _presigned_upload(client, version_id: str, files: dict[str, bytes]) -> list[dict]:
    """prepare-upload, then put the bytes where the browser would (MinIO)."""
    prepared = await client.post(
        f"/api/v1/dataset-versions/{version_id}/prepare-upload",
        json={"files": [{"filename": n, "content_type": "image/png"} for n in files]},
    )
    assert prepared.status_code == 200, prepared.text
    storage = await _storage()
    items = []
    for presigned, (name, content) in zip(prepared.json()["items"], files.items(), strict=True):
        await storage.upload(
            bucket=s3_settings.default_bucket,
            key=presigned["storage_key"],
            data=io.BytesIO(content),
        )
        items.append(
            {
                "asset_id": presigned["asset_id"],
                "filename": name,
                "storage_key": presigned["storage_key"],
                "sha256": hashlib.sha256(content).hexdigest(),
                "file_size": len(content),
                "mime_type": "image/png",
            }
        )
    return items


@pytest.mark.asyncio
async def test_finalize_returns_202_and_worker_imports_all_files(
    client, version_id, run_import_jobs
):
    items = await _presigned_upload(
        client, version_id, {"a.png": _png("red"), "b.png": _png("blue")}
    )

    accepted = await client.post(
        f"/api/v1/dataset-versions/{version_id}/finalize-import", json={"items": items}
    )
    assert accepted.status_code == 202, accepted.text
    body = accepted.json()
    assert (body["status"], body["total_items"]) == ("queued", 2)

    # Nothing is imported until a worker runs the job.
    assert (await client.get(f"/api/v1/dataset-versions/{version_id}/assets")).json() == []

    await run_import_jobs()

    job = (await client.get(f"/api/v1/asset-import-jobs/{body['job_id']}")).json()
    assert job["status"] == "succeeded", job
    assert job["new_assets_count"] == 2
    assert {a["id"] for a in job["imported_assets"]} == {i["asset_id"] for i in items}
    assets = (await client.get(f"/api/v1/dataset-versions/{version_id}/assets")).json()
    assert len(assets) == 2


@pytest.mark.asyncio
async def test_one_corrupted_file_rejects_the_whole_import(client, version_id, import_files):
    job = await import_files(
        client,
        version_id,
        [
            ("files", ("ok.png", _png("green"), "image/png")),
            ("files", ("broken.png", b"definitely not a png", "image/png")),
        ],
    )

    assert job["status"] == "failed"
    assert [e["code"] for e in job["errors"]] == ["invalid_file"]
    assert job["imported_assets"] == []
    assert (await client.get(f"/api/v1/dataset-versions/{version_id}/assets")).json() == []

    # Both staged objects are gone, including the valid one.
    storage = await _storage()
    assert not any(key.endswith(("/ok.png", "/broken.png")) for _bucket, key in storage.objects)


@pytest.mark.asyncio
async def test_checksum_lie_is_rejected(client, version_id, run_import_jobs):
    items = await _presigned_upload(client, version_id, {"a.png": _png("red")})
    items[0]["sha256"] = "0" * 64

    accepted = await client.post(
        f"/api/v1/dataset-versions/{version_id}/finalize-import", json={"items": items}
    )
    await run_import_jobs()

    job = (await client.get(f"/api/v1/asset-import-jobs/{accepted.json()['job_id']}")).json()
    assert job["status"] == "failed"
    assert job["errors"][0]["code"] == "checksum_mismatch"


@pytest.mark.asyncio
async def test_job_status_is_project_scoped(client, version_id):
    items = await _presigned_upload(client, version_id, {"a.png": _png("purple")})
    job_id = (
        await client.post(
            f"/api/v1/dataset-versions/{version_id}/finalize-import", json={"items": items}
        )
    ).json()["job_id"]

    who.user_id = OUTSIDER
    assert (await client.get(f"/api/v1/asset-import-jobs/{job_id}")).status_code == 403

    who.user_id = OWNER
    assert (await client.get("/api/v1/asset-import-jobs/unknown")).status_code == 404
