import hashlib
import io
import json
import zipfile

from modules.export.domain.services.archiver_service import (
    ArchiverService,
    ExportArtifact,
)


def test_archiver_service_creates_valid_zip_with_manifest():
    archiver = ArchiverService()

    artifacts = [
        ExportArtifact(
            relative_path="labels/train/asset_01.txt",
            content="0 0.5 0.5 0.2 0.4\n",
            source_asset_id="asset_01",
            metadata={"lines": 1},
        ),
        ExportArtifact(
            relative_path="data.yaml",
            content="names: ['cat', 'dog']\nnc: 2\n",
        ),
    ]

    zip_bytes, sha256_hash, file_size, item_records = archiver.create_archive(
        package_id="pkg_test_01",
        snapshot_id="snp_test_01",
        project_id="prj_test_01",
        format_name="yolo",
        artifacts=artifacts,
    )

    assert isinstance(zip_bytes, bytes)
    assert file_size == len(zip_bytes)
    assert hashlib.sha256(zip_bytes).hexdigest() == sha256_hash

    # Validate zip integrity
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        namelist = zf.namelist()
        assert "manifest.json" in namelist
        assert "labels/train/asset_01.txt" in namelist
        assert "data.yaml" in namelist

        # Validate manifest content
        manifest_raw = zf.read("manifest.json").decode("utf-8")
        manifest = json.loads(manifest_raw)
        assert manifest["package_id"] == "pkg_test_01"
        assert manifest["snapshot_id"] == "snp_test_01"
        assert manifest["format"] == "yolo"
        assert manifest["total_files"] == 3  # manifest + 2 artifacts

    assert len(item_records) == 1
    assert item_records[0].target_path == "labels/train/asset_01.txt"
