import json

from modules.export.domain.interfaces import (
    OntologyCategoryInfo,
    SnapshotAnnotationInfo,
    SnapshotAssetInfo,
    SnapshotExportContext,
    SnapshotItemExportData,
)
from modules.export.domain.services.coco_exporter import CocoExporter


def test_coco_exporter_creates_standard_coco_json():
    categories = [
        OntologyCategoryInfo(id="cat_01", key="dog", name="Dog"),
        OntologyCategoryInfo(id="cat_02", key="cat", name="Cat"),
    ]
    context = SnapshotExportContext(
        snapshot_id="snp_01",
        project_id="prj_01",
        version_name="v1.0.0",
        dataset_version_id="dsv_01",
        ontology_version_id="ont_01",
        outputs=[],
        categories=categories,
        total_items=1,
    )

    exporter = CocoExporter(context=context)

    item = SnapshotItemExportData(
        asset_id="asset_img_01",
        annotation_revision_id="rev_01",
        split="train",
        item_checksum="hash_01",
        asset=SnapshotAssetInfo(
            asset_id="asset_img_01",
            uri="s3://bucket/dog.jpg",
            sha256="hash_01",
            data_format="jpg",
        ),
        annotation=SnapshotAnnotationInfo(
            revision_id="rev_01",
            results=[
                {
                    "type": "rectanglelabels",
                    "value": {
                        "x": 10.0,
                        "y": 20.0,
                        "width": 30.0,
                        "height": 40.0,
                        "rectanglelabels": ["dog"],
                    },
                }
            ],
            category_ids=["cat_01"],
        ),
    )

    artifacts = exporter.export_item(item)
    assert len(artifacts) == 1

    extra_files = exporter.generate_extra_files()
    assert len(extra_files) >= 1

    train_coco = next(
        f for f in extra_files if f.relative_path == "annotations/instances_train.json"
    )
    data = json.loads(train_coco.content)

    assert "images" in data
    assert "annotations" in data
    assert "categories" in data
    assert len(data["images"]) == 1
    assert data["images"][0]["file_name"] == "asset_img_01.jpg"
    assert len(data["annotations"]) == 1
    assert data["annotations"][0]["category_id"] == 1  # 1-based dog
    assert data["annotations"][0]["bbox"] == [100.0, 200.0, 300.0, 400.0]
