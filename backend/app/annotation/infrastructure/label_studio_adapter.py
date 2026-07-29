from collections.abc import Sequence
from typing import Any

from domain.entities import AnnotationResultEntity, CategoryEntity
from domain.interfaces import IToolAdapter
from shared.utils.id_generator import generate_ulid


class LabelStudioAdapter(IToolAdapter):
    """Adapter for converting between Label Studio JSON/XML format and Internal Annotation Schema."""

    def convert_ontology_to_label_config(
        self, categories: Sequence[CategoryEntity]
    ) -> str:
        """Map Ontology Categories to Label Studio XML config string."""
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
    ) -> list[AnnotationResultEntity]:
        """Convert Label Studio webhook JSON payload into Internal Annotation Schema."""
        results: list[AnnotationResultEntity] = []

        # Label Studio webhook payload structure: payload["annotation"]["result"] or payload["result"]
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

                res = AnnotationResultEntity(
                    id=generate_ulid(),
                    revision_id="",  # set by use case
                    result_type="bbox",
                    category_id=category_name,  # Category name or ID
                    geometry={
                        "x": val.get("x", 0.0),
                        "y": val.get("y", 0.0),
                        "width": val.get("width", 0.0),
                        "height": val.get("height", 0.0),
                        "rotation": val.get("rotation", 0),
                    },
                    payload=val,
                )
                results.append(res)

            elif ls_type in ("polygonlabels", "polygon"):
                poly_labels = val.get("polygonlabels", [])
                category_name = poly_labels[0] if poly_labels else None

                res = AnnotationResultEntity(
                    id=generate_ulid(),
                    revision_id="",
                    result_type="polygon",
                    category_id=category_name,
                    geometry={
                        "points": val.get("points", []),
                    },
                    payload=val,
                )
                results.append(res)

            elif ls_type in ("choices", "taxonomy"):
                choices = val.get("choices", [])
                res = AnnotationResultEntity(
                    id=generate_ulid(),
                    revision_id="",
                    result_type="classification",
                    category_id=choices[0] if choices else None,
                    geometry=None,
                    payload=val,
                )
                results.append(res)

        return results

    def convert_internal_to_external_predictions(
        self, results: Sequence[AnnotationResultEntity]
    ) -> list[dict[str, Any]]:
        """Convert Internal Annotation Schema into Label Studio predictions format."""
        ls_predictions: list[dict[str, Any]] = []

        for r in results:
            if r.result_type == "bbox" and r.geometry:
                ls_predictions.append(
                    {
                        "from_name": "label",
                        "to_name": "image",
                        "type": "rectanglelabels",
                        "value": {
                            "x": r.geometry.get("x", 0.0),
                            "y": r.geometry.get("y", 0.0),
                            "width": r.geometry.get("width", 0.0),
                            "height": r.geometry.get("height", 0.0),
                            "rotation": r.geometry.get("rotation", 0),
                            "rectanglelabels": [r.category_id] if r.category_id else [],
                        },
                    }
                )
            elif r.result_type == "polygon" and r.geometry:
                ls_predictions.append(
                    {
                        "from_name": "polygon",
                        "to_name": "image",
                        "type": "polygonlabels",
                        "value": {
                            "points": r.geometry.get("points", []),
                            "polygonlabels": [r.category_id] if r.category_id else [],
                        },
                    }
                )

        return ls_predictions
