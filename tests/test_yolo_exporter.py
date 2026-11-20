from modules.export.domain.interfaces import (
    OntologyCategoryInfo,
    OntologyOutputInfo,
    SnapshotAnnotationInfo,
    SnapshotAssetInfo,
    SnapshotExportContext,
    SnapshotItemExportData,
)
from modules.export.domain.services.yolo_exporter import YoloExporter


def test_yolo_exporter_normalizes_bboxes_and_generates_yaml():
    categories = [
        OntologyCategoryInfo(id="cat_01", key="car", name="Car"),
        OntologyCategoryInfo(id="cat_02", key="pedestrian", name="Pedestrian"),
    ]
    outputs = [
        OntologyOutputInfo(
            id="out_01",
            name="Objects",
            definition_code="rectanglelabels",
            categories=categories,
        )
    ]
    context = SnapshotExportContext(
        snapshot_id="snp_01",
        project_id="prj_01",
        version_name="v1.0.0",
        dataset_version_id="dsv_01",
        ontology_version_id="ont_01",
        outputs=outputs,
        categories=categories,
        total_items=1,
    )

    exporter = YoloExporter(context=context)

    item = SnapshotItemExportData(
        asset_id="asset_01",
        annotation_revision_id="rev_01",
        split="train",
        item_checksum="hash01",
        asset=SnapshotAssetInfo(
            asset_id="asset_01",
            uri="s3://bucket/test.jpg",
            sha256="hash01",
            data_format="image",
        ),
        annotation=SnapshotAnnotationInfo(
            revision_id="rev_01",
            results=[
                {
                    "type": "rectanglelabels",
                    "value": {
                        "x": 20.0,
                        "y": 30.0,
                        "width": 40.0,
                        "height": 50.0,
                        "rectanglelabels": ["car"],
                    },
                },
                {
                    "type": "rectanglelabels",
                    "value": {
                        "x": 10.0,
                        "y": 10.0,
                        "width": 10.0,
                        "height": 20.0,
                        "rectanglelabels": ["pedestrian"],
                    },
                },
            ],
            category_ids=["cat_01", "cat_02"],
        ),
    )

    artifacts = exporter.export_item(item)
    assert len(artifacts) == 1
    label_artifact = artifacts[0]
    assert label_artifact.relative_path == "labels/train/asset_01.txt"

    lines = label_artifact.content.strip().split("\n")
    assert len(lines) == 2
    # car: class 0, x_center=(20+20)/100=0.4, y_center=(30+25)/100=0.55, w=0.4, h=0.5
    parts1 = lines[0].split()
    assert parts1[0] == "0"
    assert abs(float(parts1[1]) - 0.4) < 1e-4
    assert abs(float(parts1[2]) - 0.55) < 1e-4
    assert abs(float(parts1[3]) - 0.4) < 1e-4
    assert abs(float(parts1[4]) - 0.5) < 1e-4

    # pedestrian: class 1, x_center=(10+5)/100=0.15, y_center=(10+10)/100=0.2, w=0.1, h=0.2
    parts2 = lines[1].split()
    assert parts2[0] == "1"
    assert abs(float(parts2[1]) - 0.15) < 1e-4
    assert abs(float(parts2[2]) - 0.20) < 1e-4

    # Test extra files: data.yaml
    extra_artifacts = exporter.generate_extra_files()
    assert len(extra_artifacts) == 1
    yaml_artifact = extra_artifacts[0]
    assert yaml_artifact.relative_path == "data.yaml"
    assert "nc: 2" in yaml_artifact.content
    assert "car" in yaml_artifact.content
    assert "pedestrian" in yaml_artifact.content
