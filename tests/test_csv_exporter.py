import csv
import io

from modules.export.domain.interfaces import (
    OntologyCategoryInfo,
    SnapshotAnnotationInfo,
    SnapshotAssetInfo,
    SnapshotExportContext,
    SnapshotItemExportData,
)
from modules.export.domain.services.csv_exporter import CsvExporter


def test_csv_exporter_flattens_data_and_splits():
    categories = [
        OntologyCategoryInfo(id="cat_01", key="positive", name="Positive"),
        OntologyCategoryInfo(id="cat_02", key="negative", name="Negative"),
    ]
    context = SnapshotExportContext(
        snapshot_id="snp_01",
        project_id="prj_01",
        version_name="v1.0.0",
        dataset_version_id="dsv_01",
        ontology_version_id="ont_01",
        outputs=[],
        categories=categories,
        total_items=2,
    )

    exporter = CsvExporter(context=context)

    item1 = SnapshotItemExportData(
        asset_id="asset_text_01",
        annotation_revision_id="rev_01",
        split="train",
        item_checksum="hash_01",
        asset=SnapshotAssetInfo(
            asset_id="asset_text_01",
            uri="s3://bucket/t1.txt",
            sha256="hash_01",
            data_format="txt",
        ),
        annotation=SnapshotAnnotationInfo(
            revision_id="rev_01",
            results=[
                {
                    "type": "choices",
                    "value": {"choices": ["positive"], "text": "Great product!"},
                }
            ],
            category_ids=["cat_01"],
        ),
    )

    item2 = SnapshotItemExportData(
        asset_id="asset_text_02",
        annotation_revision_id="rev_02",
        split="test",
        item_checksum="hash_02",
        asset=SnapshotAssetInfo(
            asset_id="asset_text_02",
            uri="s3://bucket/t2.txt",
            sha256="hash_02",
            data_format="txt",
        ),
        annotation=SnapshotAnnotationInfo(
            revision_id="rev_02",
            results=[
                {
                    "type": "choices",
                    "value": {"choices": ["negative"], "text": "Terrible service"},
                }
            ],
            category_ids=["cat_02"],
        ),
    )

    exporter.export_item(item1)
    exporter.export_item(item2)

    extra_files = exporter.generate_extra_files()
    paths = {f.relative_path for f in extra_files}
    assert "dataset.csv" in paths
    assert "train.csv" in paths
    assert "test.csv" in paths

    # Check content of master dataset.csv
    dataset_file = next(f for f in extra_files if f.relative_path == "dataset.csv")
    reader = list(csv.DictReader(io.StringIO(dataset_file.content)))
    assert len(reader) == 2
    assert reader[0]["asset_id"] == "asset_text_01"
    assert reader[0]["label"] == "positive"
    assert reader[0]["text"] == "Great product!"
    assert reader[1]["asset_id"] == "asset_text_02"
    assert reader[1]["label"] == "negative"
