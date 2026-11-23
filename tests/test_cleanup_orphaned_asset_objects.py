"""1B.5: periodic cleanup of asset objects that no asset record references."""

import io
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from PIL import Image

from apps.api.deps import get_current_user
from apps.api.main import app
from core.config import s3_settings
from core.storage.interface import IStorageProvider, StoredObjectInfo
from modules.dataset.repository.dataset_repository import SqlDatasetRepository
from modules.dataset.use_cases.cleanup_orphaned_asset_objects import (
    CleanupOrphanedAssetObjectsUseCase,
)
from modules.identity.domain.entities import AuthUser

NOW = datetime(2026, 11, 20, 12, 0, tzinfo=UTC)
OLD = NOW - timedelta(days=3)
FRESH = NOW - timedelta(minutes=30)
BUCKET = "bkt"


class FakeStorage:
    def __init__(self, objects: dict[str, datetime], fail_delete: set[str] | None = None):
        self.objects = dict(objects)
        self.fail_delete = fail_delete or set()
        self.deleted: list[str] = []

    async def list_objects(
        self, bucket: str, *, prefix: str = ""
    ) -> AsyncIterator[StoredObjectInfo]:
        for key, modified in list(self.objects.items()):
            if key.startswith(prefix):
                yield StoredObjectInfo(key=key, size=1, last_modified=modified)

    async def delete(self, bucket: str, key: str) -> None:
        if key in self.fail_delete:
            raise OSError("storage unavailable")
        self.objects.pop(key)
        self.deleted.append(key)


class FakeRepo:
    def __init__(self, asset_ids: set[str] = frozenset(), uris: set[str] = frozenset()):
        self.asset_ids = set(asset_ids)
        self.uris = set(uris)
        self.calls = 0

    async def find_existing_asset_ids(self, asset_ids):
        self.calls += 1
        return self.asset_ids & set(asset_ids)

    async def find_existing_asset_uris(self, uris):
        return self.uris & set(uris)


def _use_case(repo, storage) -> CleanupOrphanedAssetObjectsUseCase:
    return CleanupOrphanedAssetObjectsUseCase(repo, storage, BUCKET, now=lambda: NOW)


@pytest.mark.asyncio
async def test_deletes_only_old_unreferenced_asset_objects():
    storage = FakeStorage(
        {
            "project-p1/assets/orphan/a.png": OLD,  # deleted
            "project-p1/assets/live/b.png": OLD,  # asset exists
            "project-p1/assets/legacy_key/c.png": OLD,  # referenced by uri
            "project-p1/assets/inflight/d.png": FRESH,  # too recent
            "project-p1/exports/e.json": OLD,  # not an asset key
        }
    )
    repo = FakeRepo(
        asset_ids={"live"}, uris={f"/{BUCKET}/project-p1/assets/legacy_key/c.png"}
    )

    report = await _use_case(repo, storage).execute(
        min_age=timedelta(hours=24), dry_run=False
    )

    assert storage.deleted == ["project-p1/assets/orphan/a.png"]
    assert (report.scanned, report.orphaned, report.deleted) == (5, 1, 1)
    assert report.skipped_too_recent == 1
    assert report.skipped_unrecognized == 1


@pytest.mark.asyncio
async def test_dry_run_reports_but_deletes_nothing():
    storage = FakeStorage({"project-p1/assets/orphan/a.png": OLD})

    report = await _use_case(FakeRepo(), storage).execute(
        min_age=timedelta(hours=24), dry_run=True
    )

    assert storage.deleted == []
    assert report.orphaned == 1
    assert report.deleted == 0
    assert report.sample_orphan_keys == ["project-p1/assets/orphan/a.png"]


@pytest.mark.asyncio
async def test_delete_failure_is_counted_and_cleanup_continues():
    storage = FakeStorage(
        {"project-p1/assets/x/a.png": OLD, "project-p1/assets/y/b.png": OLD},
        fail_delete={"project-p1/assets/x/a.png"},
    )

    report = await _use_case(FakeRepo(), storage).execute(
        min_age=timedelta(hours=24), dry_run=False
    )

    assert (report.failed, report.deleted) == (1, 1)
    assert storage.deleted == ["project-p1/assets/y/b.png"]


@pytest.mark.asyncio
async def test_processes_large_listings_in_batches():
    storage = FakeStorage({f"project-p1/assets/id{i}/f.png": OLD for i in range(5)})
    repo = FakeRepo(asset_ids={"id0", "id4"})

    report = await _use_case(repo, storage).execute(
        min_age=timedelta(hours=24), dry_run=False, batch_size=2
    )

    assert repo.calls == 3
    assert report.deleted == 3
    assert sorted(storage.objects) == [
        "project-p1/assets/id0/f.png",
        "project-p1/assets/id4/f.png",
    ]


@pytest.mark.asyncio
async def test_rejects_window_shorter_than_presigned_url_lifetime():
    with pytest.raises(ValueError, match="at least 1 hour"):
        await _use_case(FakeRepo(), FakeStorage({})).execute(
            min_age=timedelta(minutes=10)
        )


@pytest.mark.asyncio
async def test_end_to_end_with_database_keeps_uploaded_asset(
    test_session_factory, import_files
):
    """Real repository: an uploaded asset survives, a stray object is removed."""
    user = AuthUser(id=401, name="u", email="u@dut.ai", status="ACTIVE", role_names=[])
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            project_id = (
                await client.post(
                    "/api/v1/projects", json={"name": "Orphans", "project_type": "detection"}
                )
            ).json()["id"]
            version_id = (
                await client.post(
                    f"/api/v1/projects/{project_id}/datasets", json={"name": "ds"}
                )
            ).json()["versions"][0]["id"]
            buf = io.BytesIO()
            Image.new("RGB", (5, 5), "purple").save(buf, format="PNG")
            imported = await import_files(
                client, version_id, [("files", ("kept.png", buf.getvalue(), "image/png"))]
            )
            assert imported["status"] == "succeeded", imported
            kept_asset_id = imported["imported_assets"][0]["id"]
    finally:
        app.dependency_overrides.clear()

    async with app.state.dishka_container() as request_container:
        storage = await request_container.get(IStorageProvider)
    bucket = s3_settings.default_bucket
    stray_key = f"project-{project_id}/assets/NEVERFINALIZED/stray.png"
    await storage.upload(bucket=bucket, key=stray_key, data=io.BytesIO(b"x"))

    async with test_session_factory() as session:
        report = await CleanupOrphanedAssetObjectsUseCase(
            SqlDatasetRepository(session),
            storage,
            bucket,
            now=lambda: datetime.now(UTC) + timedelta(days=2),
        ).execute(min_age=timedelta(hours=24), dry_run=False)

    remaining = {key for (b, key) in storage.objects if b == bucket}
    assert stray_key not in remaining
    assert any(f"/assets/{kept_asset_id}/" in key for key in remaining)
    assert stray_key in report.sample_orphan_keys
