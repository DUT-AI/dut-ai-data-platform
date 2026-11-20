from modules.export.domain.interfaces import (
    OntologyCategoryInfo,
    SnapshotAnnotationInfo,
    SnapshotAssetInfo,
    SnapshotExportContext,
    SnapshotItemExportData,
)
from modules.export.domain.services.archiver_service import ArchiverService
from modules.export.domain.services.canonical_exporter import (
    CanonicalJsonExporter,
)
from modules.export.domain.services.yolo_exporter import YoloExporter


def test_item_traceability_across_exporters():
    context = SnapshotExportContext(
        snapshot_id="snp_trace_01",
        project_id="prj_trace_01",
        version_name="v1.0.0",
        dataset_version_id="dsv_01",
        ontology_version_id="ont_01",
        outputs=[],
        categories=[OntologyCategoryInfo(id="c1", key="car", name="Car")],
        total_items=1,
    )

    yolo_exporter = YoloExporter(context=context)
    canonical_exporter = CanonicalJsonExporter(context=context)
    archiver = ArchiverService()

    item_data = SnapshotItemExportData(
        asset_id="asset_test_99",
        annotation_revision_id="rev_test_88",
        split="train",
        item_checksum="item_hash_77",
        asset=SnapshotAssetInfo(
            asset_id="asset_test_99",
            uri="s3://bucket/test.jpg",
            sha256="asset_hash_66",
            data_format="jpg",
        ),
        annotation=SnapshotAnnotationInfo(
            revision_id="rev_test_88",
            results=[
                {
                    "type": "rectanglelabels",
                    "value": {
                        "x": 10.0,
                        "y": 10.0,
                        "width": 20.0,
                        "height": 20.0,
                        "rectanglelabels": ["car"],
                    },
                }
            ],
            category_ids=["c1"],
        ),
    )

    # 1. Test YOLO Artifact Traceability
    yolo_artifacts = yolo_exporter.export_item(item_data)
    assert len(yolo_artifacts) == 1
    art_yolo = yolo_artifacts[0]
    assert art_yolo.source_asset_id == "asset_test_99"
    assert art_yolo.source_annotation_revision_id == "rev_test_88"
    assert art_yolo.split == "train"

    # 2. Test Canonical Artifact Traceability
    canon_artifacts = canonical_exporter.export_item(item_data)
    assert len(canon_artifacts) == 1
    art_canon = canon_artifacts[0]
    assert art_canon.source_asset_id == "asset_test_99"
    assert art_canon.source_annotation_revision_id == "rev_test_88"
    assert art_canon.split == "train"

    # 3. Test Archiver Lineage Record Creation
    _, _, _, records = archiver.create_archive(
        package_id="pkg_trace_01",
        snapshot_id="snp_trace_01",
        project_id="prj_trace_01",
        format_name="yolo",
        artifacts=yolo_artifacts,
    )

    assert len(records) == 1
    rec = records[0]
    assert rec.export_package_id == "pkg_trace_01"
    assert rec.source_asset_id == "asset_test_99"
    assert rec.source_annotation_revision_id == "rev_test_88"
    assert rec.split == "train"
    assert rec.target_path == "labels/train/asset_test_99.txt"
    assert rec.checksum != ""
