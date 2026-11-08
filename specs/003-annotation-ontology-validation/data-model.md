# Data Model: Annotation Validation Against Ontology Version

No database schema change. The feature adds pure domain value objects and reads the existing Ontology Version contract.

## Ontology Version contract (read-only input)

| Field (entity) | Used for |
|---|---|
| `OntologyVersionEntity.status` | must be `published` |
| `OntologyEntity.project_id` (via `version.ontology_id`) | must equal the annotation's project |
| `OntologyVersionOutputEntity.output.id` | resolve `output_id` |
| `…output.definition.code` | resolve `result_type`, choose geometry rule |
| `…output.definition.supports_categories` | category required / forbidden |
| `…output.definition.default_schema` | detect a seeded copy of `value_schema` |
| `…output.value_schema` | validate `value` |
| `…output.multiple`, `…output.required` | cardinality rules |
| `OntologyVersionOutputEntity.ontology_input_id` | scope of `required` |
| `OntologyVersionOutputEntity.categories[].category_id` | allowed categories (union over links of one output) |

## Annotation result (input item, unchanged JSON)

```text
{ output_id?, result_type?, category_id?, value?, geometry?, payload?, attributes?, id?, created_at? }
```

## AnnotationIssue (new, `modules/annotation/domain/result_validation.py`)

| Field | Type | Example |
|---|---|---|
| `path` | str | `results.2.category_id`, `outputs.out_scene`, `ontology_version_id` |
| `code` | str | see the contract table in `contracts/annotation-validation-error.md` |
| `message` | str | `Kết quả #3: cần chọn Category.` |

## ResultValidationReport (new)

| Field | Type | Notes |
|---|---|---|
| `issues` | list[AnnotationIssue] | every violation, in result order, then per-output issues |
| `category_ids` | list[str] | sorted unique ids of valid results; stored on the revision |
| `is_valid` | bool (property) | `not issues` |

## Geometry rules per output type

| Definition code | Requirement |
|---|---|
| `bounding_box` | numeric `x`, `y`, `width`, `height` |
| `keypoint` | numeric `x`, `y` |
| `polygon` | `points`: ≥ 3 `[x, y]` numeric pairs |
| `named_entity`, `audio_segment`, `video_segment` | numeric `start` < `end` |

Geometry is read from `geometry`, or from `value` when `value` is an object (Label Studio format).
