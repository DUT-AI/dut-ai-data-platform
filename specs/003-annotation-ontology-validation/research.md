# Research: Annotation Validation Against Ontology Version

## R1. Where the rules live

- **Decision**: A pure function in the Annotation domain, `modules/annotation/domain/result_validation.py::validate_annotation_results(results, version) -> ResultValidationReport`. A thin application wrapper `AnnotationValidator.validate_results` raises the error.
- **Rationale**: `docs/ontology.md` says Ontology owns the schema but not annotation results. Annotation consumes the published version contract. A pure function is unit-testable without DB or HTTP.
- **Alternatives considered**:
  - Put the rules in the Ontology module: rejected, because Ontology would then own annotation semantics.
  - Generate one JSON Schema for the whole results array from `export_schema`: rejected. It cannot express "category linked to *this* output", per-item `multiple` counting, or `required` scoped to an input, and its error messages are not actionable.
  - Patch the old validator in place: rejected. It raised on the first error, and its fallback logic (single output, any category) was the root cause.

## R2. Resolving which output a result belongs to

- **Decision**:
  - `result_type` (after aliases `bbox → bounding_box`, `ner`/`named_entity_recognition → named_entity`) decides the type.
  - `output_id` selects among outputs of that type.
  - Result types unknown to the catalog (legacy `table_cell`) fall back to `output_id`.
  - Two outputs of one type with no `output_id` are rejected as `ambiguous_output`.
  - There is no implicit fallback.
- **Rationale**: The workspace stamps `exportedSchema.outputs[0].id` on every result (`annotation-workspace-view.tsx` editorMetadata). The audio editor puts the segment output id on transcripts. Making `output_id` authoritative would reject valid transcripts and accept mistyped results.
- **Alternatives considered**: `output_id` authoritative (rejected for the reason above); requiring `output_id` everywhere (rejected, because the vision editors do not send it).

## R3. Value schema

- **Decision**: Validate `value` against `output.value_schema` unless the schema is identical to the definition's `default_schema`.
- **Rationale**: The ontology rule (`modules/ontology/use_cases/outputs.py`) allows `value_schema` only for Custom Object. The template seeder (`modules/ontology/services/seeder.py`) copies `default_schema` into `value_schema` for every seeded output. Enforcing that copy would reject current editor payloads (`value: ""` for audio segments, list values for tabular multi-label).
- **Follow-up**: Align the editors with the definition type hints, then enforce the effective export contract (`value_schema or default_schema`).

## R4. Category references

- **Decision**: The public API accepts category **ids** only. Tabular multi-label lists ids in `value`, and all of them are checked and stored.

## R5. `multiple` and `required`

- **Decision**:
  - `multiple = false` allows at most one result per item. The item key is `geometry.record_key`, or the legacy `row` + `col_name`, or otherwise the whole asset.
  - `required = true` must be present when the revision labels the same input (the inputs read by the outputs present). An empty revision is valid.
- **Rationale**: Tabular stores all rows of one asset in one revision. A version may combine several inputs (image + table), so requiring every required output on every asset would be wrong.
- **Open**: The workspace has no separate draft/submit step (the save button is "submit new revision"), so `required` is enforced on every save. If a draft-save flow is introduced, `required` should move to the submit step.

## R6. Version guard

- **Decision**: Only `published` versions can be annotated (`version_not_published`). A version of another project, or a missing one, gives **404**.
- **Rationale**: A published version is immutable and identified by its hash (`docs/ontology.md`). Returning 404 avoids disclosing that a version exists in another project.

## R7. Error contract

- **Decision**: Keep HTTP 400 (`AnnotationValidationError` extends `BadRequestException`), and add `error.details.issues[] = {path, code, message}` through an optional `details` attribute on `DomainException`.
- **Rationale**: Non-breaking for existing clients. The shape mirrors Ontology version validation issues. 422 was considered, but it would change the status family for existing consumers.

## R9. Prerequisite regressions (commit `4fc115e`)

The app did not import on `dev`, and the API test suite could not run. The minimal fixes:
- identity `AuthUser`/`TokenResponse` imports point to the DTOs;
- the `IAuthClient` DI binding;
- the seeder dependency is no longer declared as `X | None`, which Dishka cannot resolve;
- the user-id DTO fields convert `int → str` to keep the JSON contract.

These are recommended as a separate commit/PR.

**Update 2026-11-08**: superseded. `dev` `87ec4e2` (spec `002-fix-clean-code-smells`) fixed all four upstream, choosing differently in two places: `AuthUser` is re-exported from `domain/entities.py`, and user ids stay `int` in the DTOs. On the rebase this branch dropped its own fixes and follows `dev`.
