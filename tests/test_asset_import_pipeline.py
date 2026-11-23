"""Asynchronous asset import: request -> Redis queue -> validation worker.

Rules (plan_validation_worker.md):
- every file is validated before anything is written;
- data error: nothing in the DB, every object of the job deleted, no retry;
- infrastructure error: rollback, objects kept, retry; last attempt cleans up;
- success: one commit, duplicates' extra objects removed afterwards.
"""

import hashlib
import io
from datetime import UTC, datetime
from typing import BinaryIO

import pytest
from PIL import Image

from core.exceptions import BadRequestException, ConflictException, ForbiddenException
from core.storage.interface import StoredObjectInfo
from modules.dataset.domain.entities import (
    AssetEntity,
    DatasetEntity,
    DatasetVersionEntity,
)
from modules.dataset.domain.import_job import ImportItem, ImportJob
from modules.dataset.services.asset_ingestion import (
    AssetFilePreparer,
    AssetObjectStore,
    build_asset_storage_key,
    sanitize_storage_filename,
)
from modules.dataset.services.asset_validation import AssetObjectValidator
from modules.dataset.use_cases.process_asset_import import (
    ProcessAssetImportUseCase,
    RetryImportLater,
)
from modules.dataset.use_cases.request_asset_import import (
    VALIDATE_ASSET_IMPORT_TASK,
    RequestAssetImportUseCase,
    StageDirectUploadUseCase,
)

PROJECT = "p1"
VERSION = "v1"
BUCKET = "bkt"


def _png(color: str) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), color).save(buf, format="PNG")
    return buf.getvalue()


# --- fakes -------------------------------------------------------------------


class FakeStorage:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}
        self.deleted: list[str] = []
        self.fail_stat = False

    def put(self, key: str, data: bytes) -> None:
        self.objects[key] = data

    async def upload(self, bucket: str, key: str, data: BinaryIO, content_type=None) -> str:
        self.objects[key] = data.read()
        return f"/{bucket}/{key}"

    async def stat(self, bucket: str, key: str):
        if self.fail_stat:
            raise ConnectionError("minio unreachable")
        if key not in self.objects:
            return None
        return StoredObjectInfo(key=key, size=len(self.objects[key]), last_modified=datetime.now(UTC))

    async def download(self, bucket: str, key: str, dest: BinaryIO) -> None:
        dest.write(self.objects[key])

    async def delete(self, bucket: str, key: str) -> None:
        self.objects.pop(key, None)
        self.deleted.append(key)


class FakeRepo:
    def __init__(self) -> None:
        self.version = DatasetVersionEntity(id=VERSION, dataset_id="ds", version="v1.0.0")
        self.dataset = DatasetEntity(id="ds", project_id=PROJECT, name="ds")
        self.assets: dict[str, AssetEntity] = {}
        self.links: list[tuple[str, str]] = []
        self.fail_save: Exception | None = None

    async def get_version_by_id(self, version_id):
        return self.version if version_id == VERSION else None

    async def get_dataset_by_id(self, dataset_id):
        return self.dataset

    async def get_assets_by_ids(self, ids):
        return [self.assets[i] for i in ids if i in self.assets]

    async def find_existing_asset_ids(self, ids):
        return {i for i in ids if i in self.assets}

    async def find_asset_by_sha256(self, project_id, sha256):
        return next((a for a in self.assets.values() if a.sha256 == sha256), None)

    async def save_asset(self, asset):
        if self.fail_save:
            raise self.fail_save
        self.assets[asset.id] = asset
        return asset

    async def add_asset_to_version(self, version_id, asset_id):
        self.links.append((version_id, asset_id))


class FakeUow:
    """Buffers repo writes like a transaction: commit keeps them, rollback drops them."""

    def __init__(self, repo: FakeRepo, fail_commit: Exception | None = None) -> None:
        self.repo = repo
        self.fail_commit = fail_commit
        self.commits = 0
        self.rollbacks = 0
        self._snapshot = (dict(repo.assets), list(repo.links))

    async def commit(self) -> None:
        if self.fail_commit:
            raise self.fail_commit
        self.commits += 1
        self._snapshot = (dict(self.repo.assets), list(self.repo.links))

    async def rollback(self) -> None:
        self.rollbacks += 1
        self.repo.assets, self.repo.links = dict(self._snapshot[0]), list(self._snapshot[1])


class FakeJobStore:
    def __init__(self) -> None:
        self.jobs: dict[str, dict] = {}

    async def save(self, job: ImportJob) -> None:
        self.jobs[job.id] = job.to_dict()

    async def get(self, job_id):
        data = self.jobs.get(job_id)
        return ImportJob.from_dict(data) if data else None


class FakeQueue:
    def __init__(self, fail: bool = False) -> None:
        self.enqueued: list[tuple] = []
        self.fail = fail

    async def enqueue(self, function, *args, job_id):
        if self.fail:
            raise ConnectionError("redis down")
        self.enqueued.append((function, args, job_id))


class FakeOutbox:
    def __init__(self) -> None:
        self.events = []

    async def save_event(self, event):
        self.events.append(event)


# --- helpers -------------------------------------------------------------------


def _item(asset_id: str, content: bytes, *, sha: str | None = None, size: int | None = None) -> ImportItem:
    return ImportItem(
        asset_id=asset_id,
        filename=f"{asset_id}.png",
        storage_key=build_asset_storage_key(PROJECT, asset_id, f"{asset_id}.png"),
        sha256=sha if sha is not None else hashlib.sha256(content).hexdigest(),
        file_size=size if size is not None else len(content),
        mime_type="image/png",
    )


class Harness:
    def __init__(self, max_tries: int = 3) -> None:
        self.storage = FakeStorage()
        self.repo = FakeRepo()
        self.uow = FakeUow(self.repo)
        self.store = FakeJobStore()
        self.outbox = FakeOutbox()
        self.max_tries = max_tries

    def stage(self, asset_id: str, content: bytes, **kw) -> ImportItem:
        item = _item(asset_id, content, **kw)
        self.storage.put(item.storage_key, content)
        return item

    async def job(self, *items: ImportItem) -> ImportJob:
        job = ImportJob(project_id=PROJECT, version_id=VERSION, items=list(items), created_by=7)
        await self.store.save(job)
        return job

    def use_case(self) -> ProcessAssetImportUseCase:
        return ProcessAssetImportUseCase(
            job_store=self.store,
            repo=self.repo,
            uow=self.uow,
            validator=AssetObjectValidator(
                self.storage, BUCKET, AssetFilePreparer(), max_file_bytes=10_000_000
            ),
            object_store=AssetObjectStore(self.storage, bucket=BUCKET),
            outbox_repo=self.outbox,
            max_tries=self.max_tries,
            retry_delay=lambda attempt: attempt * 10,
        )


# --- ProcessAssetImportUseCase -------------------------------------------------


@pytest.mark.asyncio
async def test_all_valid_commits_once_and_keeps_objects():
    h = Harness()
    job = await h.job(h.stage("a1", _png("red")), h.stage("a2", _png("blue")))

    result = await h.use_case().execute(job.id, attempt=1)

    assert result.status == "succeeded"
    assert (result.new_assets_count, result.reused_assets_count) == (2, 0)
    assert result.imported_asset_ids == ["a1", "a2"]
    assert h.uow.commits == 1
    assert set(h.repo.assets) == {"a1", "a2"}
    assert len(h.storage.objects) == 2
    assert len(h.outbox.events) == 2
    # Values come from the stored file, not from the client's declaration.
    assert h.repo.assets["a1"].sha256 == hashlib.sha256(_png("red")).hexdigest()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("make_bad", "code"),
    [
        (lambda h: h.stage("bad", b"not an image"), "invalid_file"),
        (lambda h: h.stage("bad", _png("green"), sha="0" * 64), "checksum_mismatch"),
        (lambda h: h.stage("bad", _png("green"), size=1), "size_mismatch"),
        (lambda h: _item("bad", _png("green")), "object_missing"),
    ],
)
async def test_one_bad_file_fails_whole_job_and_deletes_every_object(make_bad, code):
    h = Harness()
    good = h.stage("good", _png("red"))
    job = await h.job(good, make_bad(h))

    result = await h.use_case().execute(job.id, attempt=1)

    assert result.status == "failed"
    assert [e.code for e in result.errors] == [code]
    assert h.repo.assets == {} and h.repo.links == []
    assert h.uow.commits == 0
    assert h.storage.objects == {}  # the valid file is deleted too


@pytest.mark.asyncio
async def test_data_error_is_reported_per_file_without_retry():
    h = Harness()
    job = await h.job(h.stage("x", b"junk"), h.stage("y", _png("red"), sha="f" * 64))

    result = await h.use_case().execute(job.id, attempt=1)  # no RetryImportLater

    assert [(e.asset_id, e.code) for e in result.errors] == [
        ("x", "invalid_file"),
        ("y", "checksum_mismatch"),
    ]


@pytest.mark.asyncio
async def test_version_published_while_queued_fails_and_cleans_up():
    h = Harness()
    job = await h.job(h.stage("a1", _png("red")))
    h.repo.version.status = "published"

    result = await h.use_case().execute(job.id, attempt=1)

    assert result.status == "failed"
    assert result.errors[0].code == "version_not_draft"
    assert h.storage.objects == {}


@pytest.mark.asyncio
async def test_infrastructure_error_retries_and_keeps_objects():
    h = Harness()
    job = await h.job(h.stage("a1", _png("red")))
    h.repo.fail_save = ConnectionError("db down")

    with pytest.raises(RetryImportLater) as retry:
        await h.use_case().execute(job.id, attempt=1)

    assert retry.value.defer_seconds == 10
    assert h.uow.rollbacks == 1
    assert len(h.storage.objects) == 1  # kept for the next attempt
    stored = await h.store.get(job.id)
    assert stored.status == "retrying"
    assert stored.errors[0].code == "infrastructure_error"


@pytest.mark.asyncio
async def test_commit_failure_is_an_infrastructure_error():
    h = Harness()
    job = await h.job(h.stage("a1", _png("red")))
    h.uow.fail_commit = ConnectionError("lost during commit")

    with pytest.raises(RetryImportLater):
        await h.use_case().execute(job.id, attempt=1)

    assert h.repo.assets == {}
    assert len(h.storage.objects) == 1


@pytest.mark.asyncio
async def test_last_attempt_fails_job_and_deletes_every_object():
    h = Harness(max_tries=3)
    job = await h.job(h.stage("a1", _png("red")), h.stage("a2", _png("blue")))
    h.repo.fail_save = ConnectionError("db down")

    result = await h.use_case().execute(job.id, attempt=3)  # no raise

    assert result.status == "failed"
    assert result.errors[0].code == "infrastructure_error"
    assert h.storage.objects == {}


@pytest.mark.asyncio
async def test_retry_then_success():
    h = Harness()
    job = await h.job(h.stage("a1", _png("red")))
    h.repo.fail_save = ConflictException("uq_project_sha256")
    with pytest.raises(RetryImportLater):
        await h.use_case().execute(job.id, attempt=1)

    h.repo.fail_save = None
    result = await h.use_case().execute(job.id, attempt=2)

    assert result.status == "succeeded"
    assert result.attempt == 2


@pytest.mark.asyncio
async def test_duplicates_reuse_asset_and_drop_extra_object_after_commit():
    h = Harness()
    h.repo.assets["old"] = AssetEntity(
        id="old",
        project_id=PROJECT,
        filename="old.png",
        uri="/bkt/old",
        mime_type="image/png",
        file_size=1,
        sha256=hashlib.sha256(_png("red")).hexdigest(),
    )
    h.uow = FakeUow(h.repo)
    same_as_old = h.stage("dup", _png("red"))
    twice_a = h.stage("t1", _png("blue"))
    twice_b = h.stage("t2", _png("blue"))
    job = await h.job(same_as_old, twice_a, twice_b)

    result = await h.use_case().execute(job.id, attempt=1)

    assert result.status == "succeeded"
    assert result.imported_asset_ids == ["old", "t1", "t1"]
    assert (result.new_assets_count, result.reused_assets_count) == (1, 2)
    assert set(h.storage.deleted) == {same_as_old.storage_key, twice_b.storage_key}
    assert twice_a.storage_key in h.storage.objects


@pytest.mark.asyncio
async def test_rerun_after_commit_does_not_duplicate_or_delete():
    """arq is at-least-once: commit succeeded but the status was never saved."""
    h = Harness()
    item = h.stage("a1", _png("red"))
    job = await h.job(item)
    await h.use_case().execute(job.id, attempt=1)
    h.store.jobs[job.id]["status"] = "processing"  # status update was lost

    result = await h.use_case().execute(job.id, attempt=2)

    assert result.status == "succeeded"
    assert list(h.repo.assets) == ["a1"]
    assert item.storage_key in h.storage.objects


@pytest.mark.asyncio
async def test_finished_job_is_not_processed_again():
    h = Harness()
    job = await h.job(h.stage("a1", _png("red")))
    await h.use_case().execute(job.id, attempt=1)
    commits = h.uow.commits

    await h.use_case().execute(job.id, attempt=1)

    assert h.uow.commits == commits


@pytest.mark.asyncio
async def test_unknown_or_expired_job_is_ignored():
    assert await Harness().use_case().execute("missing", attempt=1) is None


@pytest.mark.asyncio
async def test_abort_never_deletes_objects_referenced_by_existing_assets():
    h = Harness()
    item = h.stage("a1", _png("red"))
    h.repo.assets["a1"] = AssetEntity(
        id="a1", project_id=PROJECT, filename="a1.png", uri="/bkt/x",
        mime_type="image/png", file_size=1, sha256="s",
    )
    h.uow = FakeUow(h.repo)
    job = await h.job(item, h.stage("bad", b"junk"))

    await h.use_case().execute(job.id, attempt=1)

    assert item.storage_key in h.storage.objects


# --- RequestAssetImportUseCase / StageDirectUploadUseCase ----------------------


def _request(repo: FakeRepo, store: FakeJobStore, queue: FakeQueue, max_items: int = 5):
    return RequestAssetImportUseCase(repo, store, queue, max_items=max_items)


@pytest.mark.asyncio
async def test_request_saves_queued_job_and_enqueues_it_once():
    repo, store, queue = FakeRepo(), FakeJobStore(), FakeQueue()

    job = await _request(repo, store, queue).execute(VERSION, [_item("a1", b"x")], created_by=7)

    assert job.status == "queued"
    assert (await store.get(job.id)).items[0].asset_id == "a1"
    assert queue.enqueued == [(VALIDATE_ASSET_IMPORT_TASK, (job.id,), job.id)]
    assert repo.assets == {}  # nothing written synchronously


@pytest.mark.asyncio
async def test_request_rejects_too_many_files_and_foreign_keys():
    repo, store, queue = FakeRepo(), FakeJobStore(), FakeQueue()
    uc = _request(repo, store, queue, max_items=1)

    with pytest.raises(BadRequestException, match="at most 1"):
        await uc.execute(VERSION, [_item("a", b"x"), _item("b", b"y")], created_by=7)

    foreign = ImportItem(
        asset_id="a", filename="x.png", storage_key="project-other/assets/a/x.png",
        sha256="s", file_size=1,
    )
    with pytest.raises(ForbiddenException):
        await uc.execute(VERSION, [foreign], created_by=7)
    assert queue.enqueued == []


@pytest.mark.asyncio
async def test_request_rejects_published_version():
    repo = FakeRepo()
    repo.version.status = "published"

    with pytest.raises(BadRequestException, match="Only draft versions allow asset uploads"):
        await _request(repo, FakeJobStore(), FakeQueue()).execute(
            VERSION, [_item("a", b"x")], created_by=7
        )


@pytest.mark.asyncio
async def test_direct_upload_stages_files_then_queues_one_job():
    repo, store, queue, storage = FakeRepo(), FakeJobStore(), FakeQueue(), FakeStorage()
    uc = StageDirectUploadUseCase(AssetObjectStore(storage, BUCKET), _request(repo, store, queue))

    job = await uc.execute(VERSION, [("a.png", _png("red"), "image/png"), ("e", b"", None)], 7)

    assert job.source == "direct"
    assert len(job.items) == 1  # empty file skipped
    assert job.items[0].storage_key in storage.objects
    assert job.items[0].sha256 == hashlib.sha256(_png("red")).hexdigest()


@pytest.mark.asyncio
async def test_direct_upload_deletes_staged_files_when_queueing_fails():
    repo, store, storage = FakeRepo(), FakeJobStore(), FakeStorage()
    uc = StageDirectUploadUseCase(
        AssetObjectStore(storage, BUCKET), _request(repo, store, FakeQueue(fail=True))
    )

    with pytest.raises(ConnectionError):
        await uc.execute(VERSION, [("a.png", _png("red"), "image/png")], 7)

    assert storage.objects == {}


# --- worker wiring ---------------------------------------------------------------


@pytest.mark.asyncio
async def test_worker_turns_retry_request_into_arq_retry(monkeypatch):
    from arq import Retry

    from apps.validation_worker import main as worker

    async def fail_with_retry(self, job_id, attempt):
        raise RetryImportLater(30, ConnectionError("db down"))

    monkeypatch.setattr(ProcessAssetImportUseCase, "execute", fail_with_retry)

    class Session:
        async def __aenter__(self):
            return object()

        async def __aexit__(self, *exc):
            return False

    ctx = {
        "job_try": 1,
        "session_factory": Session,
        "job_store": FakeJobStore(),
        "validator": None,
        "object_store": None,
    }
    with pytest.raises(Retry) as raised:
        await worker.validate_asset_import(ctx, "job-1")
    assert raised.value.defer_score == 30_000


def test_worker_settings_one_job_per_process():
    from apps.validation_worker.main import WorkerSettings

    assert WorkerSettings.max_jobs == 1
    assert [f.name for f in WorkerSettings.functions] == [VALIDATE_ASSET_IMPORT_TASK]


# --- object keys (moved from the former synchronous upload tests) ----------------


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("image_01.jpg", "image_01.jpg"),
        ("../../etc/passwd", "passwd"),
        ("C:\\Users\\x\\ảnh mèo.png", "_nh_m_o.png"),
        ("..hidden", "hidden"),
        ("", "file"),
    ],
)
def test_sanitize_storage_filename(raw, expected):
    assert sanitize_storage_filename(raw) == expected


def test_build_asset_storage_key_stays_under_asset_prefix():
    key = build_asset_storage_key("p1", "a1", "../../project-p2/assets/x/secret.png")
    assert key == "project-p1/assets/a1/secret.png"


def test_default_cleanup_window_is_safe_for_import_jobs():
    """Defaults must not trigger the startup warning (24h > ~47 min)."""
    from core.config import asset_import_settings, s3_settings

    assert asset_import_settings.max_processing_seconds == 3 * 900 + 5 + 30
    assert s3_settings.orphan_cleanup_min_age_hours * 3600 > (
        asset_import_settings.max_processing_seconds
    )
