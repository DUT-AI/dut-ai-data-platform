from typing import Any
import jsonschema
from core.exceptions import BadRequestException
from modules.ontology.domain.entities import OntologyVersionEntity


class AnnotationValidator:
    """Domain service to validate annotation results dynamically against Ontology definitions."""

    @staticmethod
    def validate_results(
        results: list[dict[str, Any]],
        ontology_version: OntologyVersionEntity,
    ) -> list[str]:
        """Validates results against OntologyVersion outputs, value schemas, and allowed categories.

        Returns:
            list[str]: Extracted unique category IDs found in results.
        """
        output_map = {
            link.output.id: link
            for link in ontology_version.outputs
            if link.output is not None
        }
        # Also index by output definition code or output name for flexibility
        output_def_map = {}
        for link in ontology_version.outputs:
            if link.output and link.output.definition:
                output_def_map[link.output.definition.code] = link

        extracted_category_ids: set[str] = set()

        for idx, item in enumerate(results):
            if not isinstance(item, dict):
                raise BadRequestException(f"Result #{idx + 1} must be a valid JSON object.")

            output_id = item.get("output_id")
            output_code = item.get("output_code") or item.get("result_type")

            output_link = None
            if output_id and output_id in output_map:
                output_link = output_map[output_id]
            elif output_code and output_code in output_def_map:
                output_link = output_def_map[output_code]
            elif output_map:
                # If there is only one output defined, fallback to it
                if len(output_map) == 1:
                    output_link = next(iter(output_map.values()))

            category_id = item.get("category_id")
            if category_id:
                # Verify category exists in ontology
                allowed_cats_for_output = set()
                if output_link and output_link.categories:
                    for cat_link in output_link.categories:
                        if cat_link.category:
                            allowed_cats_for_output.add(cat_link.category.id)
                            allowed_cats_for_output.add(cat_link.category.name)
                            allowed_cats_for_output.add(cat_link.category.key)
                else:
                    # Check global categories in ontology version
                    for cat in ontology_version.categories:
                        allowed_cats_for_output.add(cat.id)
                        allowed_cats_for_output.add(cat.name)
                        allowed_cats_for_output.add(cat.key)

                if allowed_cats_for_output and category_id not in allowed_cats_for_output:
                    raise BadRequestException(
                        f"Result #{idx + 1}: Category '{category_id}' is not permitted for this Ontology Version."
                    )
                extracted_category_ids.add(category_id)

            # Validate against value_schema if present
            value = item.get("value")
            if output_link and output_link.output and output_link.output.value_schema and value is not None:
                try:
                    jsonschema.validate(instance=value, schema=output_link.output.value_schema)
                except jsonschema.ValidationError as err:
                    raise BadRequestException(
                        f"Result #{idx + 1}: Value violates output schema: {err.message}"
                    ) from err

            # Standard shape validations for common CV types
            result_type = item.get("result_type") or (
                output_link.output.definition.code
                if output_link and output_link.output and output_link.output.definition
                else None
            )
            geometry = item.get("geometry") or (value if isinstance(value, dict) else None)
            if result_type == "bbox" and geometry:
                for req_key in ("x", "y", "width", "height"):
                    if req_key not in geometry:
                        raise BadRequestException(
                            f"Result #{idx + 1}: BBox geometry missing required attribute '{req_key}'."
                        )
            elif result_type == "polygon" and geometry:
                if "points" not in geometry or not isinstance(geometry["points"], list):
                    raise BadRequestException(
                        f"Result #{idx + 1}: Polygon geometry missing 'points' array."
                    )

        return sorted(list(extracted_category_ids))
