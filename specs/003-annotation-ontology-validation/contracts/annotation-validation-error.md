# Contract: Annotation validation error

Applies to:
- `POST /api/v1/annotations`
- `POST /api/v1/annotations/{annotation_id}/revisions`
- `POST /api/v1/annotations/sync` (Label Studio webhook; see the last section)

## Rejection (HTTP 400)

```json
{
  "error": {
    "code": "AnnotationValidationError",
    "message": "Kết quả gán nhãn không khớp Ontology Version (2 lỗi). Kết quả #1: Ontology Version không có Output loại 'polygon'.",
    "details": {
      "issues": [
        {
          "path": "results.0.result_type",
          "code": "unknown_output",
          "message": "Kết quả #1: Ontology Version không có Output loại 'polygon'."
        },
        {
          "path": "results.1.category_id",
          "code": "category_not_allowed",
          "message": "Kết quả #2: Category 'cat_x' không được nối với Output này."
        }
      ]
    }
  }
}
```

- `error.code` and `error.message` keep the existing envelope. `details` is additive: old clients keep working.
- `issues` is never truncated. Clients choose how many to show (the workspace shows 3 and then "+N lỗi khác").

## Issue codes (stable)

| Code | Path | Meaning |
|---|---|---|
| `version_not_published` | `ontology_version_id` | the version is a draft |
| `invalid_result` | `results.<i>` | the item is not an object |
| `output_required` | `results.<i>.output_id` | the item has neither `output_id` nor `result_type` |
| `unknown_output` | `results.<i>.output_id` / `.result_type` | the output is not in the version, or the version has no output of that type |
| `ambiguous_output` | `results.<i>.output_id` | several outputs share the type; `output_id` is needed |
| `category_required` | `results.<i>.category_id` | the output needs a category |
| `category_not_allowed` | `results.<i>.category_id` | the category is not linked to that output in this version |
| `categories_not_supported` | `results.<i>.category_id` | the output type has no categories |
| `value_schema_violation` | `results.<i>.value` | `value` violates the output's `value_schema` |
| `invalid_value_schema` | `results.<i>.value` | the stored `value_schema` itself is invalid |
| `geometry_required` | `results.<i>.geometry` | no geometry for a geometric/span output |
| `geometry_invalid` | `results.<i>.geometry[.points]` | geometry is malformed (see `data-model.md`) |
| `multiple_not_allowed` | `outputs.<output_id>` | a `multiple=false` output has more than one result on the same item |
| `required_output_missing` | `outputs.<output_id>` | a `required` output is missing for a labelled input |

## Not found (HTTP 404)

The version does not exist, **or** belongs to another project. The envelope is the same, with `code: "NotFoundException"`.

## Label Studio webhook

When the payload violates the contract, the webhook answers `200 null`, logs the issues, and stores nothing. A valid payload creates the next sequential revision. Label text is mapped to a category id by `key`, then by `name`.
