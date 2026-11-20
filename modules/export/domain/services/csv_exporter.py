import csv
import io
from typing import Any

from modules.export.domain.interfaces import (
    SnapshotExportContext,
    SnapshotItemExportData,
)
from modules.export.domain.services.base_exporter import ExportArtifact, IFormatExporter


class CsvExporter(IFormatExporter):
    """Tabular and classification CSV exporter flattening assets and annotations."""

    def __init__(
        self,
        context: SnapshotExportContext,
        target_output_id: str | None = None,
    ) -> None:
        self.context = context
        self.target_output_id = target_output_id
        self._categories_by_id = {c.id: c.name for c in context.categories}
        self._rows: list[dict[str, Any]] = []

    def export_item(self, item: SnapshotItemExportData) -> list[ExportArtifact]:
        label_keys: list[str] = []
        text_val: str = ""

        if item.annotation and item.annotation.results:
            for res in item.annotation.results:
                val = res.get("value", {})
                if isinstance(val, dict):
                    choices = val.get("choices") or val.get("labels") or []
                    if choices:
                        label_keys.extend(str(c) for c in choices)
                    if "text" in val:
                        txt = val["text"]
                        text_val = txt[0] if isinstance(txt, list) and txt else str(txt)

        primary_label = label_keys[0] if label_keys else ""
        row = {
            "asset_id": item.asset_id,
            "split": item.split,
            "label": primary_label,
            "all_labels": ";".join(label_keys),
            "text": text_val,
            "uri": item.asset.uri,
            "checksum": item.item_checksum,
        }
        self._rows.append(row)

        return [
            ExportArtifact(
                relative_path=f"data/{item.split}/{item.asset_id}.csv_ref",
                content=f"{item.asset_id},{primary_label},{item.split}\n",
                source_asset_id=item.asset_id,
                source_annotation_revision_id=item.annotation_revision_id,
                split=item.split,
                metadata={"label": primary_label},
            )
        ]

    def generate_extra_files(self) -> list[ExportArtifact]:
        if not self._rows:
            return []

        fieldnames = [
            "asset_id",
            "split",
            "label",
            "all_labels",
            "text",
            "uri",
            "checksum",
        ]

        # Master CSV
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(self._rows)

        artifacts = [
            ExportArtifact(
                relative_path="dataset.csv",
                content=buffer.getvalue(),
            )
        ]

        # Split CSVs
        splits = {r["split"] for r in self._rows}
        for split in splits:
            split_rows = [r for r in self._rows if r["split"] == split]
            s_buf = io.StringIO()
            s_writer = csv.DictWriter(s_buf, fieldnames=fieldnames)
            s_writer.writeheader()
            s_writer.writerows(split_rows)
            artifacts.append(
                ExportArtifact(
                    relative_path=f"{split}.csv",
                    content=s_buf.getvalue(),
                )
            )

        return artifacts
