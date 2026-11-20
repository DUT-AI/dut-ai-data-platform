from modules.export.domain.exceptions import IncompatibleFormatError
from modules.export.domain.interfaces import (
    SnapshotExportContext,
    SnapshotItemExportData,
)
from modules.export.domain.services.base_exporter import ExportArtifact, IFormatExporter


class YoloExporter(IFormatExporter):
    """YOLO Object Detection exporter converting bounding boxes to [class x y w h]."""

    def __init__(
        self,
        context: SnapshotExportContext,
        target_output_id: str | None = None,
    ) -> None:
        self.context = context
        self.target_output_id = target_output_id

        # Determine target output definition
        matching_output = None
        if target_output_id:
            for out in context.outputs:
                if out.id == target_output_id:
                    matching_output = out
                    break
            if not matching_output:
                raise IncompatibleFormatError(
                    f"Specified target_output_id '{target_output_id}' not found in ontology outputs."
                )
        else:
            # Find output with rectanglelabels or rectangle
            for out in context.outputs:
                if out.definition_code in ("rectanglelabels", "rectangle", "bbox"):
                    matching_output = out
                    break

        # Map classes: class_key -> index
        self.class_names: list[str] = []
        self.class_map: dict[str, int] = {}

        candidate_categories = (
            matching_output.categories
            if matching_output and matching_output.categories
            else context.categories
        )

        for cat in candidate_categories:
            if cat.key not in self.class_map:
                idx = len(self.class_names)
                self.class_names.append(cat.key)
                self.class_map[cat.key] = idx
                self.class_map[cat.name] = idx
                self.class_map[cat.id] = idx

    def _map_split_name(self, split: str) -> str:
        s = split.lower()
        if s in ("validation", "val"):
            return "val"
        if s in ("train", "test"):
            return s
        return "default"

    def export_item(self, item: SnapshotItemExportData) -> list[ExportArtifact]:
        split_dir = self._map_split_name(item.split)
        lines: list[str] = []

        if item.annotation and item.annotation.results:
            for res in item.annotation.results:
                val = res.get("value", {})
                if not isinstance(val, dict):
                    continue

                labels = val.get("rectanglelabels") or val.get("labels") or []
                x = val.get("x")
                y = val.get("y")
                w = val.get("width")
                h = val.get("height")

                if x is None or y is None or w is None or h is None or not labels:
                    continue

                # Identify class
                label_name = labels[0]
                if label_name not in self.class_map:
                    # Dynamically allocate class index if not present
                    idx = len(self.class_names)
                    self.class_names.append(str(label_name))
                    self.class_map[str(label_name)] = idx

                class_id = self.class_map[str(label_name)]

                # Label Studio stores percentages (0 - 100). Normalize to 0.0 - 1.0
                norm_w = float(w) / 100.0 if float(w) > 1.0 else float(w)
                norm_h = float(h) / 100.0 if float(h) > 1.0 else float(h)
                norm_x = float(x) / 100.0 if float(x) > 1.0 else float(x)
                norm_y = float(y) / 100.0 if float(y) > 1.0 else float(y)

                x_center = norm_x + (norm_w / 2.0)
                y_center = norm_y + (norm_h / 2.0)

                # Clamp values to [0.0, 1.0]
                x_center = max(0.0, min(1.0, x_center))
                y_center = max(0.0, min(1.0, y_center))
                norm_w = max(0.0, min(1.0, norm_w))
                norm_h = max(0.0, min(1.0, norm_h))

                lines.append(
                    f"{class_id} {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}"
                )

        content = "\n".join(lines) + ("\n" if lines else "")
        target_path = f"labels/{split_dir}/{item.asset_id}.txt"

        return [
            ExportArtifact(
                relative_path=target_path,
                content=content,
                source_asset_id=item.asset_id,
                source_annotation_revision_id=item.annotation_revision_id,
                split=item.split,
                metadata={"num_bboxes": len(lines)},
            )
        ]

    def generate_extra_files(self) -> list[ExportArtifact]:
        yaml_lines = [
            "path: ../",
            "train: images/train",
            "val: images/val",
            "test: images/test",
            f"nc: {len(self.class_names)}",
            "names:",
        ]
        for i, name in enumerate(self.class_names):
            yaml_lines.append(f"  {i}: {name}")

        return [
            ExportArtifact(
                relative_path="data.yaml",
                content="\n".join(yaml_lines) + "\n",
            )
        ]
