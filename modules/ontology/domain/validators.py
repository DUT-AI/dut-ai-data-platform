import hashlib
import json
from typing import Any

from modules.ontology.domain.entities import (
    OntologyInputEntity,
    OntologyVersionEntity,
    ValidationIssue,
)


def validate_input(entity: OntologyInputEntity) -> list[ValidationIssue]:
    schema = entity.input_schema
    issues: list[ValidationIssue] = []
    if entity.definition is None:
        issues.append(
            ValidationIssue(
                "definition_id", "missing_definition", "Input Definition không tồn tại."
            )
        )
        return issues
    if schema.get("type") != entity.definition.code:
        issues.append(
            ValidationIssue(
                "input_schema.type",
                "type_mismatch",
                "type phải khớp Input Definition đã chọn.",
            )
        )
    extensions = schema.get("allowed_extensions")
    if not isinstance(extensions, list) or not extensions:
        issues.append(
            ValidationIssue(
                "input_schema.allowed_extensions",
                "extensions_required",
                "Cần ít nhất một đuôi file.",
            )
        )
    elif not set(extensions).issubset(set(entity.definition.allowed_formats)):
        issues.append(
            ValidationIssue(
                "input_schema.allowed_extensions",
                "format_not_supported",
                "Có đuôi file không được Input Definition hỗ trợ.",
            )
        )
    item = schema.get("item")
    if entity.scope == "ONE_ITEM" and item is not None:
        issues.append(
            ValidationIssue(
                "input_schema.item",
                "item_must_be_null",
                "ONE_ITEM yêu cầu item = null.",
            )
        )
    if entity.scope == "MANY_ITEMS" and not isinstance(item, dict):
        issues.append(
            ValidationIssue(
                "input_schema.item",
                "item_required",
                "MANY_ITEMS yêu cầu item là object.",
            )
        )
    return issues


def validate_version(version: OntologyVersionEntity) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    input_ids = {item.ontology_input_id for item in version.inputs}
    if not input_ids:
        issues.append(
            ValidationIssue("inputs", "input_required", "Cần ít nhất một Input.")
        )
    if not version.outputs:
        issues.append(
            ValidationIssue("outputs", "output_required", "Cần ít nhất một Output.")
        )
    for index, link in enumerate(version.inputs):
        if link.input is None or link.input.ontology_id != version.ontology_id:
            issues.append(
                ValidationIssue(
                    f"inputs.{index}",
                    "foreign_input",
                    "Input phải thuộc cùng Ontology.",
                )
            )
        else:
            issues.extend(
                ValidationIssue(
                    f"inputs.{index}.{issue.path}", issue.code, issue.message
                )
                for issue in validate_input(link.input)
            )
    for index, link in enumerate(version.outputs):
        if link.ontology_input_id not in input_ids:
            issues.append(
                ValidationIssue(
                    f"outputs.{index}.input_id",
                    "input_not_in_version",
                    "Input nguồn chưa được thêm vào Version.",
                )
            )
        if link.output is None or link.output.ontology_id != version.ontology_id:
            issues.append(
                ValidationIssue(
                    f"outputs.{index}",
                    "foreign_output",
                    "Output phải thuộc cùng Ontology.",
                )
            )
            continue
        definition = link.output.definition
        categories = [item.category for item in link.categories]
        if any(
            item is None or item.ontology_id != version.ontology_id
            for item in categories
        ):
            issues.append(
                ValidationIssue(
                    f"outputs.{index}.categories",
                    "foreign_category",
                    "Category phải thuộc cùng Ontology.",
                )
            )
        if definition and not definition.supports_categories and categories:
            issues.append(
                ValidationIssue(
                    f"outputs.{index}.categories",
                    "categories_not_supported",
                    "Output này không hỗ trợ Category.",
                )
            )
        if definition and definition.supports_categories and not categories:
            issues.append(
                ValidationIssue(
                    f"outputs.{index}.categories",
                    "category_required",
                    "Output đánh nhãn cần ít nhất một Category.",
                )
            )
        if (
            definition
            and definition.code == "custom_object"
            and not link.output.value_schema
        ):
            issues.append(
                ValidationIssue(
                    f"outputs.{index}.value_schema",
                    "schema_required",
                    "Custom Object cần value_schema.",
                )
            )
    return issues


def export_schema(version: OntologyVersionEntity) -> dict[str, Any]:
    inputs = []
    for link in sorted(version.inputs, key=lambda item: item.sort_order):
        if link.input is None:
            continue
        inputs.append(
            {
                "id": link.input.id,
                "name": link.input.name,
                "scope": link.input.scope,
                "schema": link.input.input_schema,
            }
        )
    outputs = []
    for link in sorted(version.outputs, key=lambda item: item.sort_order):
        if link.output is None or link.output.definition is None:
            continue
        outputs.append(
            {
                "id": link.output.id,
                "name": link.output.name,
                "type": link.output.definition.code,
                "input_id": link.ontology_input_id,
                "multiple": link.output.multiple,
                "required": link.output.required,
                "value_schema": link.output.value_schema
                or link.output.definition.default_schema,
                "categories": [
                    {
                        "id": item.category.id,
                        "key": item.category.key,
                        "name": item.category.name,
                        "color": item.category.color,
                        "description": item.category.description,
                    }
                    for item in link.categories
                    if item.category is not None
                ],
            }
        )
    return {
        "ontology_id": version.ontology_id,
        "ontology_version_id": version.id,
        "version_no": version.version_no,
        "version_name": version.name,
        "status": version.status,
        "schema_hash": version.schema_hash,
        "inputs": inputs,
        "outputs": outputs,
    }


def calculate_schema_hash(version: OntologyVersionEntity) -> str:
    payload = export_schema(version)
    payload["schema_hash"] = None
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return f"sha256:{hashlib.sha256(raw.encode()).hexdigest()}"
