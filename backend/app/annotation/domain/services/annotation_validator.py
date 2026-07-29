from domain.entities import (
    AnnotationResultEntity,
    OntologyVersionEntity,
)
from domain.exceptions import BadRequestException


class AnnotationValidator:
    """Domain service to validate annotation results against Ontology definitions."""

    @staticmethod
    def validate_results(
        results: list[AnnotationResultEntity],
        ontology_version: OntologyVersionEntity,
    ) -> None:
        valid_category_ids = {c.id for c in ontology_version.categories}
        valid_category_names = {c.name for c in ontology_version.categories}

        for idx, res in enumerate(results):
            # Validate Category ID/Name if specified
            if (
                res.category_id
                and res.category_id not in valid_category_ids
                and res.category_id not in valid_category_names
            ):
                raise BadRequestException(
                    f"Result #{idx + 1}: Category '{res.category_id}' does not exist in Ontology Version '{ontology_version.version}'."
                )

            # Validate Geometry for BBox
            if res.result_type == "bbox" and res.geometry:
                for req_key in ("x", "y", "width", "height"):
                    if req_key not in res.geometry:
                        raise BadRequestException(
                            f"Result #{idx + 1}: BBox geometry missing required attribute '{req_key}'."
                        )

            # Validate Geometry for Polygon
            elif (
                res.result_type == "polygon"
                and res.geometry
                and (
                    "points" not in res.geometry
                    or not isinstance(res.geometry["points"], list)
                )
            ):
                raise BadRequestException(
                    f"Result #{idx + 1}: Polygon geometry missing 'points' array."
                )
