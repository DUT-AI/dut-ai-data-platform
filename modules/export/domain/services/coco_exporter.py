import json
from collections import defaultdict
from typing import Any

from modules.export.domain.exceptions import IncompatibleFormatError
from modules.export.domain.interfaces import (
    SnapshotExportContext,
    SnapshotItemExportData,
)
from modules.export.domain.services.base_exporter import ExportArtifact, IFormatExporter


class CocoExporter(IFormatExporter):
    """COCO format exporter assembling dataset instances annotations JSON by split."""

    def __init__(
        self,
        context: SnapshotExportContext,
        target_output_id: str | None = None,
    ) -> None:
        self.context = context
        self.target_output_id = target_output_id

        # Verify output compatibility
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

        # Categories: id (1-based int), name, supercategory
        self.categories: list[dict[str, Any]] = []
        self.category_id_map: dict[str, int] = {}

        candidate_categories = (
            matching_output.categories
            if matching_output and matching_output.categories
            else context.categories
        )

        for idx, cat in enumerate(candidate_categories, start=1):
            self.categories.append(
                {"id": idx, "name": cat.key, "supercategory": "none"}
            )
            self.category_id_map[cat.key] = idx
            self.category_id_map[cat.name] = idx
            self.category_id_map[cat.id] = idx

        # Accumulators per split
        self._split_images: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self._split_annotations: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self._ann_counter = 1
        self._img_counter = 1

    def _map_split(self, split: str) -> str:
        s = split.lower()
        if s in ("validation", "val"):
            return "val"
        if s in ("train", "test"):
            return s
        return "default"

    def export_item(self, item: SnapshotItemExportData) -> list[ExportArtifact]:
        split_name = self._map_split(item.split)
        image_id = self._img_counter
        self._img_counter += 1

        ext = item.asset.data_format.lower() if item.asset.data_format else "jpg"
        if not ext.startswith("."):
            ext = f".{ext}"
        file_name = f"{item.asset_id}{ext}"

        # Standard default dims if not known
        img_w = 1000
        img_h = 1000

        self._split_images[split_name].append(
            {
                "id": image_id,
                "file_name": file_name,
                "width": img_w,
                "height": img_h,
                "asset_id": item.asset_id,
            }
        )

        num_annotations = 0
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

                label_name = labels[0]
                if str(label_name) not in self.category_id_map:
                    new_id = len(self.categories) + 1
                    self.categories.append(
                        {"id": new_id, "name": str(label_name), "supercategory": "none"}
                    )
                    self.category_id_map[str(label_name)] = new_id

                cat_id = self.category_id_map[str(label_name)]

                # Normalize percentage to pixel coordinates based on img_w/img_h
                x_px = (float(x) / 100.0 if float(x) > 1.0 else float(x)) * img_w
                y_px = (float(y) / 100.0 if float(y) > 1.0 else float(y)) * img_h
                w_px = (float(w) / 100.0 if float(w) > 1.0 else float(w)) * img_w
                h_px = (float(h) / 100.0 if float(h) > 1.0 else float(h)) * img_h
                area = w_px * h_px

                self._split_annotations[split_name].append(
                    {
                        "id": self._ann_counter,
                        "image_id": image_id,
                        "category_id": cat_id,
                        "bbox": [
                            round(x_px, 2),
                            round(y_px, 2),
                            round(w_px, 2),
                            round(h_px, 2),
                        ],
                        "area": round(area, 2),
                        "segmentation": [],
                        "iscrowd": 0,
                    }
                )
                self._ann_counter += 1
                num_annotations += 1

        # Return a trace artifact for the item
        return [
            ExportArtifact(
                relative_path=f"annotations/{split_name}/{item.asset_id}.ref",
                content=f"asset_id={item.asset_id}\nimage_id={image_id}\nannotations={num_annotations}\n",
                source_asset_id=item.asset_id,
                source_annotation_revision_id=item.annotation_revision_id,
                split=item.split,
                metadata={"image_id": image_id, "num_annotations": num_annotations},
            )
        ]

    def generate_extra_files(self) -> list[ExportArtifact]:
        artifacts: list[ExportArtifact] = []

        all_splits = set(self._split_images.keys()) | {"train"}
        for split in sorted(all_splits):
            coco_dict = {
                "images": self._split_images.get(split, []),
                "annotations": self._split_annotations.get(split, []),
                "categories": self.categories,
            }
            artifacts.append(
                ExportArtifact(
                    relative_path=f"annotations/instances_{split}.json",
                    content=json.dumps(coco_dict, indent=2),
                )
            )

        return artifacts
