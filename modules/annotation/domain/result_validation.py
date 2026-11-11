"""Validate annotation results against an Ontology Version contract.

Pure domain logic (no framework, no I/O). The Annotation domain owns these
rules; the Ontology domain only supplies the contract of a version: its
outputs, the input each output reads, the categories linked to each output,
the ``multiple``/``required`` flags and custom value schemas.
"""

from collections import Counter
from dataclasses import dataclass, field
from typing import Any

import jsonschema

from modules.ontology.domain.catalog import OUTPUT_DEFINITIONS
from modules.ontology.domain.entities import (
    OntologyOutputEntity,
    OntologyVersionEntity,
    OntologyVersionOutputEntity,
)

# Result types emitted by the workspace editors that differ from the Output
# Definition codes of the catalog.
RESULT_TYPE_ALIASES: dict[str, str] = {
    "bbox": "bounding_box",
    "ner": "named_entity",
    "named_entity_recognition": "named_entity",
}

# Output types known to the platform catalog. A ``result_type`` outside this
# set is an editor-specific/legacy tag and does not contradict ``output_id``.
_KNOWN_OUTPUT_CODES = frozenset(definition[0] for definition in OUTPUT_DEFINITIONS)

# Geometry every result of these output types must carry (numeric fields).
_GEOMETRY_NUMERIC_KEYS: dict[str, tuple[str, ...]] = {
    "bounding_box": ("x", "y", "width", "height"),
    "keypoint": ("x", "y"),
    "named_entity": ("start", "end"),
    "audio_segment": ("start", "end"),
    "video_segment": ("start", "end"),
}
_POLYGON_MIN_POINTS = 3

# Geometry fields identifying one item inside an asset (tabular records/cells).
_ITEM_KEY_FIELDS = ("record_key", "row", "col_name")

OutputLinks = dict[str, list[OntologyVersionOutputEntity]]
ItemCounts = Counter[tuple[str, tuple[Any, ...]]]


@dataclass(frozen=True)
class AnnotationIssue:
    """One violated rule: where (``path``), which rule (``code``) and why."""

    path: str
    code: str
    message: str


@dataclass(frozen=True)
class ResultValidationReport:
    issues: list[AnnotationIssue] = field(default_factory=list)
    category_ids: list[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        return not self.issues


def normalize_result_type(result_type: Any) -> str | None:
    if not isinstance(result_type, str) or not result_type:
        return None
    return RESULT_TYPE_ALIASES.get(result_type, result_type)


def validate_annotation_results(
    results: list[Any], version: OntologyVersionEntity
) -> ResultValidationReport:
    """Collect every violation of ``results`` against ``version``.

    Never stops at the first problem so clients can show all of them at once.
    """
    links = _links_by_output_id(version)
    issues: list[AnnotationIssue] = []
    category_ids: set[str] = set()
    counts: ItemCounts = Counter()
    touched_inputs: set[str] = set()

    for index, item in enumerate(results):
        path = f"results.{index}"
        label = f"Kết quả #{index + 1}"
        if not isinstance(item, dict):
            issues.append(
                AnnotationIssue(path, "invalid_result", f"{label} phải là object JSON.")
            )
            continue

        output_id, resolve_issue = _resolve_output_id(item, links, path, label)
        if output_id is None:
            issues.append(resolve_issue)
            continue

        output_links = links[output_id]
        output = output_links[0].output
        touched_inputs.update(link.ontology_input_id for link in output_links)
        counts[(output_id, _item_key(item))] += 1

        issues.extend(_check_category(item, output_links, path, label, category_ids))
        issues.extend(_check_value(item, output, path, label))
        if output.definition is not None:
            issues.extend(_check_geometry(item, output.definition.code, path, label))

    issues.extend(_check_multiple(counts, links))
    issues.extend(_check_required(version, counts, touched_inputs))
    return ResultValidationReport(issues=issues, category_ids=sorted(category_ids))


def _links_by_output_id(version: OntologyVersionEntity) -> OutputLinks:
    links: OutputLinks = {}
    for link in version.outputs:
        if link.output is not None:
            links.setdefault(link.output.id, []).append(link)
    return links


def _resolve_output_id(
    item: dict[str, Any], links: OutputLinks, path: str, label: str
) -> tuple[str, None] | tuple[None, AnnotationIssue]:
    """Find the single output a result belongs to.

    ``result_type`` says *what* the result is; ``output_id`` only picks one
    output among those of that type. Editors stamp the workspace's primary
    output id on every result (e.g. audio transcripts carry the segment
    output id), so ``output_id`` alone must not override the type. When the
    version has no output of that type at all (legacy editor types such as
    ``table_cell``), ``output_id`` is used as given.
    """
    output_id = item.get("output_id")
    if output_id and output_id not in links:
        return None, AnnotationIssue(
            f"{path}.output_id",
            "unknown_output",
            f"{label}: Output '{output_id}' không thuộc Ontology Version này.",
        )

    code = normalize_result_type(item.get("result_type"))
    if code is None:
        if output_id:
            return output_id, None
        return None, AnnotationIssue(
            f"{path}.output_id",
            "output_required",
            f"{label}: cần output_id hoặc result_type.",
        )

    typed = [
        candidate_id
        for candidate_id, output_links in links.items()
        if _definition_code(output_links[0].output) == code
    ]
    if output_id in typed:
        return output_id, None
    if len(typed) == 1:
        return typed[0], None
    if len(typed) > 1:
        return None, AnnotationIssue(
            f"{path}.output_id",
            "ambiguous_output",
            f"{label}: có nhiều Output loại '{code}', cần chỉ rõ output_id.",
        )
    if output_id and code not in _KNOWN_OUTPUT_CODES:
        return output_id, None
    return None, AnnotationIssue(
        f"{path}.result_type",
        "unknown_output",
        f"{label}: Ontology Version không có Output loại '{code}'.",
    )


def _check_category(
    item: dict[str, Any],
    output_links: list[OntologyVersionOutputEntity],
    path: str,
    label: str,
    category_ids: set[str],
) -> list[AnnotationIssue]:
    definition = output_links[0].output.definition
    supports_categories = bool(definition and definition.supports_categories)
    category_id = item.get("category_id")

    if not supports_categories:
        if category_id:
            return [
                AnnotationIssue(
                    f"{path}.category_id",
                    "categories_not_supported",
                    f"{label}: Output này không dùng Category.",
                )
            ]
        return []

    requested = _requested_category_ids(item, definition.code)
    if not requested:
        return [
            AnnotationIssue(
                f"{path}.category_id",
                "category_required",
                f"{label}: cần chọn Category.",
            )
        ]
    allowed = {
        category_link.category_id
        for link in output_links
        for category_link in link.categories
    }
    rejected = [candidate for candidate in requested if candidate not in allowed]
    if rejected:
        return [
            AnnotationIssue(
                f"{path}.category_id",
                "category_not_allowed",
                f"{label}: Category {', '.join(repr(c) for c in rejected)} "
                "không được nối với Output này.",
            )
        ]
    category_ids.update(requested)
    return []


def _requested_category_ids(item: dict[str, Any], code: str) -> list[str]:
    """Category ids a result claims: ``category_id`` plus, for multi-label
    classification (tabular), every id listed in ``value``."""
    requested: list[str] = []
    category_id = item.get("category_id")
    if category_id:
        requested.append(category_id)
    value = item.get("value")
    if code == "classification" and isinstance(value, list):
        requested.extend(entry for entry in value if isinstance(entry, str))
    return list(dict.fromkeys(requested))


def _check_value(
    item: dict[str, Any], output: OntologyOutputEntity, path: str, label: str
) -> list[AnnotationIssue]:
    """Enforce a value schema only when it was declared for this output.

    A schema equal to the definition's ``default_schema`` is just the type hint
    copied by the template seeder; it is not a user-defined constraint.
    """
    schema = output.value_schema
    value = item.get("value")
    if not schema or value is None:
        return []
    if output.definition is not None and schema == output.definition.default_schema:
        return []
    try:
        jsonschema.validate(instance=value, schema=schema)
    except jsonschema.ValidationError as err:
        return [
            AnnotationIssue(
                f"{path}.value",
                "value_schema_violation",
                f"{label}: value không khớp value_schema ({err.message}).",
            )
        ]
    except jsonschema.SchemaError:
        return [
            AnnotationIssue(
                f"{path}.value",
                "invalid_value_schema",
                f"{label}: value_schema của Output không hợp lệ.",
            )
        ]
    return []


def _check_geometry(
    item: dict[str, Any], code: str, path: str, label: str
) -> list[AnnotationIssue]:
    if code != "polygon" and code not in _GEOMETRY_NUMERIC_KEYS:
        return []
    geometry = _geometry_of(item)
    if geometry is None:
        return [
            AnnotationIssue(
                f"{path}.geometry",
                "geometry_required",
                f"{label}: thiếu geometry cho Output loại '{code}'.",
            )
        ]

    if code == "polygon":
        if _is_point_list(geometry.get("points")):
            return []
        return [
            AnnotationIssue(
                f"{path}.geometry.points",
                "geometry_invalid",
                f"{label}: polygon cần ít nhất {_POLYGON_MIN_POINTS} điểm [x, y].",
            )
        ]

    missing = [
        key for key in _GEOMETRY_NUMERIC_KEYS[code] if not _is_number(geometry.get(key))
    ]
    if missing:
        return [
            AnnotationIssue(
                f"{path}.geometry",
                "geometry_invalid",
                f"{label}: geometry thiếu hoặc sai kiểu số: {', '.join(missing)}.",
            )
        ]
    if "start" in geometry and geometry["start"] >= geometry["end"]:
        return [
            AnnotationIssue(
                f"{path}.geometry",
                "geometry_invalid",
                f"{label}: start phải nhỏ hơn end.",
            )
        ]
    return []


def _check_multiple(counts: ItemCounts, links: OutputLinks) -> list[AnnotationIssue]:
    issues: list[AnnotationIssue] = []
    for (output_id, _), count in counts.items():
        output = links[output_id][0].output
        if not output.multiple and count > 1:
            issues.append(
                AnnotationIssue(
                    f"outputs.{output_id}",
                    "multiple_not_allowed",
                    f"Output '{output.name}' chỉ cho phép 1 kết quả cho mỗi item "
                    f"(đang có {count}).",
                )
            )
    return issues


def _check_required(
    version: OntologyVersionEntity, counts: ItemCounts, touched_inputs: set[str]
) -> list[AnnotationIssue]:
    """Required outputs reading an input that this revision labels must be present."""
    present = {output_id for output_id, _ in counts}
    issues: list[AnnotationIssue] = []
    reported: set[str] = set()
    for link in version.outputs:
        output = link.output
        if (
            output is None
            or not output.required
            or output.id in present
            or output.id in reported
            or link.ontology_input_id not in touched_inputs
        ):
            continue
        reported.add(output.id)
        issues.append(
            AnnotationIssue(
                f"outputs.{output.id}",
                "required_output_missing",
                f"Output bắt buộc '{output.name}' chưa có kết quả.",
            )
        )
    return issues


def _definition_code(output: OntologyOutputEntity) -> str | None:
    return output.definition.code if output.definition is not None else None


def _geometry_of(item: dict[str, Any]) -> dict[str, Any] | None:
    geometry = item.get("geometry")
    if isinstance(geometry, dict):
        return geometry
    value = item.get("value")
    return value if isinstance(value, dict) else None


def _item_key(item: dict[str, Any]) -> tuple[Any, ...]:
    geometry = item.get("geometry")
    if not isinstance(geometry, dict):
        return (None,) * len(_ITEM_KEY_FIELDS)
    return tuple(geometry.get(key) for key in _ITEM_KEY_FIELDS)


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _is_point_list(points: Any) -> bool:
    return (
        isinstance(points, list)
        and len(points) >= _POLYGON_MIN_POINTS
        and all(
            isinstance(point, (list, tuple))
            and len(point) >= 2
            and _is_number(point[0])
            and _is_number(point[1])
            for point in points
        )
    )


__all__ = [
    "RESULT_TYPE_ALIASES",
    "AnnotationIssue",
    "ResultValidationReport",
    "normalize_result_type",
    "validate_annotation_results",
]
