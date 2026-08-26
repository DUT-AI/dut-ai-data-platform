from core.exceptions import BadRequestException
from modules.annotation.domain.entities import AnnotationResultEntity
from modules.ontology.domain.entities import OntologyVersionEntity


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
            if (
                res.category_id
                and res.category_id not in valid_category_ids
                and res.category_id not in valid_category_names
            ):
                raise BadRequestException(
                    f"Result #{idx + 1}: Category '{res.category_id}' does not exist in Ontology Version '{ontology_version.version}'."
                )

            if res.result_type == "bbox" and res.geometry:
                for req_key in ("x", "y", "width", "height"):
                    if req_key not in res.geometry:
                        raise BadRequestException(
                            f"Result #{idx + 1}: BBox geometry missing required attribute '{req_key}'."
                        )

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
