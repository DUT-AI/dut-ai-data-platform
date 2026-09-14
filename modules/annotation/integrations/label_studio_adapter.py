from collections.abc import Sequence
from typing import Any

from core.utils.id_generator import generate_ulid
from modules.ontology.domain.entities import CategoryEntity


class LabelStudioAdapter:
    """Adapter for converting between Label Studio JSON/XML format and Internal Annotation Schema (Legacy)."""

    def convert_ontology_to_label_config(
        self, categories: Sequence[CategoryEntity]
    ) -> str:
        labels_xml = []
        for cat in categories:
            color = cat.color or "#3B82F6"
            label_name = cat.display_name or cat.name
            labels_xml.append(f'    <Label value="{label_name}" background="{color}"/>')

        labels_content = "\n".join(labels_xml)

        xml_config = f"""<View>
  <Image name="image" value="$image"/>
  <RectangleLabels name="label" toName="image">
{labels_content}
  </RectangleLabels>
  <PolygonLabels name="polygon" toName="image">
{labels_content}
  </PolygonLabels>
</View>"""
        return xml_config

    def convert_external_annotation_to_internal(
        self, external_payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []

        ls_results = (
            external_payload.get("annotation", {}).get("result")
            or external_payload.get("result")
            or []
        )

        for item in ls_results:
            ls_type = item.get("type", "")
            val = item.get("value", {})

            if ls_type in ("rectanglelabels", "rectangle"):
                bbox_labels = val.get("rectanglelabels", [])
                category_name = bbox_labels[0] if bbox_labels else None

                results.append(
                    {
                        "id": generate_ulid(),
                        "result_type": "bbox",
                        "category_id": category_name,
                        "value": {
                            "type": "bbox",
                            "x": val.get("x", 0.0),
                            "y": val.get("y", 0.0),
                            "width": val.get("width", 0.0),
                            "height": val.get("height", 0.0),
                            "rotation": val.get("rotation", 0),
                        },
                        "attributes": val,
                    }
                )

            elif ls_type in ("polygonlabels", "polygon"):
                poly_labels = val.get("polygonlabels", [])
                category_name = poly_labels[0] if poly_labels else None

                results.append(
                    {
                        "id": generate_ulid(),
                        "result_type": "polygon",
                        "category_id": category_name,
                        "value": {
                            "type": "polygon",
                            "points": val.get("points", []),
                        },
                        "attributes": val,
                    }
                )

            elif ls_type in ("choices", "taxonomy"):
                choices = val.get("choices", [])
                results.append(
                    {
                        "id": generate_ulid(),
                        "result_type": "classification",
                        "category_id": choices[0] if choices else None,
                        "value": choices[0] if choices else None,
                        "attributes": val,
                    }
                )

        return results

    def convert_internal_to_external_predictions(
        self, results: Sequence[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        ls_predictions: list[dict[str, Any]] = []

        for r in results:
            rtype = r.get("result_type")
            val = r.get("value", {})
            cat = r.get("category_id")

            if rtype == "bbox" and isinstance(val, dict):
                ls_predictions.append(
                    {
                        "from_name": "label",
                        "to_name": "image",
                        "type": "rectanglelabels",
                        "value": {
                            "x": val.get("x", 0.0),
                            "y": val.get("y", 0.0),
                            "width": val.get("width", 0.0),
                            "height": val.get("height", 0.0),
                            "rotation": val.get("rotation", 0),
                            "rectanglelabels": [cat] if cat else [],
                        },
                    }
                )
            elif rtype == "polygon" and isinstance(val, dict):
                ls_predictions.append(
                    {
                        "from_name": "polygon",
                        "to_name": "image",
                        "type": "polygonlabels",
                        "value": {
                            "points": val.get("points", []),
                            "polygonlabels": [cat] if cat else [],
                        },
                    }
                )

        return ls_predictions
