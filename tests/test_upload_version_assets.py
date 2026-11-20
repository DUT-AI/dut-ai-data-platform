"""UploadVersionAssetsUseCase: transactional upload without orphaned objects."""

import io
from typing import BinaryIO

import pytest
from PIL import Image

from core.exceptions import BadRequestException, ConflictException
from modules.dataset.domain.entities import (
    AssetEntity,
    DatasetEntity,
    DatasetVersionEntity,
)
from modules.dataset.services.asset_ingestion import (
    AssetFilePreparer,
    AssetObjectStore,
    build_asset_storage_key,
    sanitize_storage_filename,
)
from modules.dataset.use_cases import UploadVersionAssetsUseCase

PROJECT_ID = "prj_1"
VERSION_ID = "ver_1"


def _png(color: str) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), color).save(buf, format="PNG")
    return buf.getvalue()


class FakeUnitOfWork:
    def __init__(self, fail_commit: bool = False) -> None:
        self.fail_commit = fail_commit
        self.commits = 0
        self.rollbacks = 0

    async def commit(self) -> None:
        self.commits += 1
        if self.fail_commit:
            raise RuntimeError("connection lost during commit")

    async def rollback(self) -> None:
        self.rollbacks += 1


class FakeStorage:
    def __init__(self, fail_delete: bool = False) -> None:
        self.objects: dict[tuple[str, str], bytes] = {}
        self.uploads = 0
        self.fail_delete = fail_delete

    async def upload(
        self, bucket: str, key: str, data: BinaryIO, content_type: str | None = None
    ) -> str:
        self.uploads += 1
        self.objects[(bucket, key)] = data.read()
        return f"/{bucket}/{key}"

    async def delete(self, bucket: str, key: str) -> None:
        if self.fail_delete:
            raise OSError("storage unavailable")
        self.objects.pop((bucket, key), None)


class FakeRepo:
    def __init__(self, fail_save_on_call: int | None = None, conflict: bool = False):
        self.version = DatasetVersionEntity(
            id=VERSION_ID, dataset_id="ds_1", version="v1.0.0", status="draft"
        )
        self.dataset = DatasetEntity(id="ds_1", project_id=PROJECT_ID, name="ds")
        self.assets: dict[str, AssetEntity] = {}
        self.links: list[tuple[str, str]] = []
        self.save_calls = 0
        self.fail_save_on_call = fail_save_on_call
        self.conflict = conflict

    async def get_version_by_id(self, version_id: str):
        return self.version if version_id == VERSION_ID else None

    async def get_dataset_by_id(self, dataset_id: str):
        return self.dataset

    async def find_asset_by_sha256(self, project_id: str, sha256: str):
        return next(
            (a for a in self.assets.values() if a.project_id == project_id and a.sha256 == sha256),
            None,
        )

    async def save_asset(self, asset: AssetEntity) -> AssetEntity:
        self.save_calls += 1
        if self.conflict:
            raise ConflictException("uq_project_sha256")
        if self.fail_save_on_call == self.save_calls:
            raise RuntimeError("db error on insert")
        self.assets[asset.id] = asset
        return asset

    async def add_asset_to_version(self, version_id: str, asset_id: str):
        self.links.append((version_id, asset_id))


def _use_case(repo, storage, uow) -> UploadVersionAssetsUseCase:
    return UploadVersionAssetsUseCase(
        repo=repo,
        uow=uow,
        preparer=AssetFilePreparer(),
        object_store=AssetObjectStore(storage, bucket="bkt"),
    )


@pytest.mark.asyncio
async def test_success_commits_once_and_keeps_objects():
    repo, storage, uow = FakeRepo(), FakeStorage(), FakeUnitOfWork()

    result = await _use_case(repo, storage, uow).execute(
        VERSION_ID, [("a.png", _png("red"), "image/png"), ("b.png", _png("blue"), "image/png")]
    )

    assert result.new_assets_count == 2
    assert (uow.commits, uow.rollbacks) == (1, 0)
    assert len(storage.objects) == 2


@pytest.mark.asyncio
async def test_db_error_mid_batch_rolls_back_and_deletes_uploaded_objects():
    repo, storage, uow = FakeRepo(fail_save_on_call=2), FakeStorage(), FakeUnitOfWork()

    with pytest.raises(RuntimeError, match="db error"):
        await _use_case(repo, storage, uow).execute(
            VERSION_ID,
            [("a.png", _png("red"), "image/png"), ("b.png", _png("blue"), "image/png")],
        )

    assert storage.uploads == 2
    assert storage.objects == {}
    assert (uow.commits, uow.rollbacks) == (0, 1)


@pytest.mark.asyncio
async def test_commit_failure_rolls_back_and_deletes_uploaded_objects():
    repo, storage, uow = FakeRepo(), FakeStorage(), FakeUnitOfWork(fail_commit=True)

    with pytest.raises(RuntimeError, match="commit"):
        await _use_case(repo, storage, uow).execute(
            VERSION_ID, [("a.png", _png("red"), "image/png")]
        )

    assert storage.uploads == 1
    assert storage.objects == {}
    assert uow.rollbacks == 1


@pytest.mark.asyncio
async def test_invalid_file_anywhere_in_batch_uploads_nothing():
    repo, storage, uow = FakeRepo(), FakeStorage(), FakeUnitOfWork()

    with pytest.raises(BadRequestException):
        await _use_case(repo, storage, uow).execute(
            VERSION_ID,
            [
                ("a.png", _png("red"), "image/png"),
                ("b.png", _png("blue"), "image/png"),
                ("broken.jpg", b"not an image", "image/jpeg"),
            ],
        )

    assert storage.uploads == 0
    assert uow.commits == 0


@pytest.mark.asyncio
async def test_duplicate_content_in_same_batch_is_uploaded_once():
    repo, storage, uow = FakeRepo(), FakeStorage(), FakeUnitOfWork()
    same = _png("green")

    result = await _use_case(repo, storage, uow).execute(
        VERSION_ID, [("one.png", same, "image/png"), ("two.png", same, "image/png")]
    )

    assert storage.uploads == 1
    assert result.new_assets_count == 1
    assert result.reused_assets_count == 1


@pytest.mark.asyncio
async def test_concurrent_duplicate_conflict_cleans_up_and_returns_409():
    repo, storage, uow = FakeRepo(conflict=True), FakeStorage(), FakeUnitOfWork()

    with pytest.raises(ConflictException):
        await _use_case(repo, storage, uow).execute(
            VERSION_ID, [("a.png", _png("red"), "image/png")]
        )

    assert storage.objects == {}
    assert uow.rollbacks == 1


@pytest.mark.asyncio
async def test_cleanup_failure_does_not_mask_original_error():
    repo = FakeRepo(fail_save_on_call=1)
    storage, uow = FakeStorage(fail_delete=True), FakeUnitOfWork()

    with pytest.raises(RuntimeError, match="db error"):
        await _use_case(repo, storage, uow).execute(
            VERSION_ID, [("a.png", _png("red"), "image/png")]
        )


@pytest.mark.asyncio
async def test_published_version_rejects_upload():
    repo, storage, uow = FakeRepo(), FakeStorage(), FakeUnitOfWork()
    repo.version.status = "published"

    with pytest.raises(BadRequestException, match="Only draft versions allow asset uploads"):
        await _use_case(repo, storage, uow).execute(
            VERSION_ID, [("a.png", _png("red"), "image/png")]
        )
    assert storage.uploads == 0


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
