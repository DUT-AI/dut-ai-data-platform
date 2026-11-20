import json

from modules.export.domain.interfaces import (
    SnapshotExportContext,
    SnapshotItemExportData,
)
from modules.export.domain.services.base_exporter import ExportArtifact, IFormatExporter


class CanonicalJsonExporter(IFormatExporter):
    """Canonical JSON/JSONL exporter providing full fidelity multi-task representations."""

    def __init__(
        self,
        context: SnapshotExportContext,
        target_output_id: str | None = None,
        as_jsonl: bool = False,
    ) -> None:
        self.context = context
        self.target_output_id = target_output_id
        self.as_jsonl = as_jsonl
        self._categories_by_id = {c.id: c.name for c in context.categories}

    def export_item(self, item: SnapshotItemExportData) -> list[ExportArtifact]:
        ann_data = None
        if item.annotation:
            ann_data = {
                "revision_id": item.annotation.revision_id,
                "source": item.annotation.source,
                "results": item.annotation.results,
                "category_ids": item.annotation.category_ids,
                "category_names": [
                    self._categories_by_id.get(cid, cid)
                    for cid in item.annotation.category_ids
                ],
            }

        item_payload = {
            "asset_id": item.asset_id,
            "split": item.split,
            "checksum": item.item_checksum,
            "asset": {
                "uri": item.asset.uri,
                "sha256": item.asset.sha256,
                "format": item.asset.data_format,
            },
            "annotation": ann_data,
        }

        split_dir = (
            item.split if item.split in ("train", "validation", "test") else "default"
        )
        path = f"data/{split_dir}/{item.asset_id}.json"

        return [
            ExportArtifact(
                relative_path=path,
                content=json.dumps(item_payload, indent=2),
                source_asset_id=item.asset_id,
                source_annotation_revision_id=item.annotation_revision_id,
                split=item.split,
                metadata={"format": "canonical_json"},
            )
        ]

    def generate_extra_files(self) -> list[ExportArtifact]:
        # Generate schema and ontology metadata
        meta = {
            "snapshot_id": self.context.snapshot_id,
            "project_id": self.context.project_id,
            "version_name": self.context.version_name,
            "dataset_version_id": self.context.dataset_version_id,
            "ontology_version_id": self.context.ontology_version_id,
            "outputs": [
                {
                    "id": o.id,
                    "name": o.name,
                    "definition_code": o.definition_code,
                    "categories": [
                        {"id": c.id, "key": c.key, "name": c.name} for c in o.categories
                    ],
                }
                for o in self.context.outputs
            ],
            "categories": [
                {"id": c.id, "key": c.key, "name": c.name}
                for c in self.context.categories
            ],
        }
        return [
            ExportArtifact(
                relative_path="dataset_meta.json",
                content=json.dumps(meta, indent=2),
            )
        ]
