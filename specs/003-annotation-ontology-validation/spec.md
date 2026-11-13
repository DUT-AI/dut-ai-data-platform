# Feature Specification: Annotation Validation Against Ontology Version

**Feature Branch**: `feat/integrate_ontology_annotation_validation`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Tích hợp quy tắc ontology vào annotation, hiện tại annotation chưa validate bằng ontology đã định nghĩa"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reject annotation results that break the Ontology contract (Priority: P1)

As an Annotator saving work in the Annotation Workspace, I want the platform to refuse results that do not match the project's Ontology Version (unknown output, wrong category, wrong shape, invalid value), so that every stored revision is guaranteed to follow the schema the Project Owner defined and downstream export/training never receives malformed labels.

**Why this priority**: Today almost nothing is enforced: editor result types (`bbox`, `ner`) do not match ontology output codes (`bounding_box`, `named_entity`), unknown results silently fall back to "the only output", and `required`/`multiple`/category rules are ignored. Without this story the Ontology is only a UI hint, not a contract (`docs/ontology.md` › Integration contracts).

**Independent Test**: Publish an Ontology Version with one Bounding Box output linked to categories *Car* and *Pedestrian*, then save (a) a valid box with *Car*, (b) a polygon, (c) a box with a category from another output, (d) a box missing `height`. Only (a) is stored; (b)–(d) are rejected and nothing is written.

**Acceptance Scenarios**:

1. **Given** a published version with a Bounding Box output, **When** a result with `result_type="bbox"`, a linked category and complete geometry is saved, **Then** a revision is created and its `category_ids` contains that category id.
2. **Given** the same version, **When** a result of type `polygon` is saved, **Then** the save is rejected with issue code `unknown_output` and no revision is created.
3. **Given** an output that supports categories, **When** a result has no category or a category not linked to that output in this version, **Then** the save is rejected with `category_required` / `category_not_allowed`.
4. **Given** an output that does not support categories (Text, Number), **When** a result carries a `category_id`, **Then** the save is rejected with `categories_not_supported`.
5. **Given** an output with a `value_schema`, **When** `value` violates it, **Then** the save is rejected with `value_schema_violation`.
6. **Given** an output with `multiple = false`, **When** two results for that output target the same item (same asset, or same tabular record), **Then** the save is rejected with `multiple_not_allowed`; results for different tabular records are accepted.
7. **Given** an output with `required = true` reading the same input as other results in the revision, **When** that output has no result, **Then** the save is rejected with `required_output_missing`; an empty revision (clearing all labels) is accepted.

---

### User Story 2 - Only annotate against a valid, published version of the project's own Ontology (Priority: P1)

As a Project Owner, I want annotations to be accepted only against a **published** Ontology Version that belongs to the same project, so that labels are always tied to an immutable, hash-identified schema and cannot be attached to another project's ontology.

**Why this priority**: Draft versions are mutable; labels written against them can silently become invalid when the draft changes. Cross-project versions break data isolation.

**Independent Test**: Try to save an annotation with (a) a draft version id, (b) a published version id from another project. Both are rejected (draft: `version_not_published`; foreign: not found).

**Acceptance Scenarios**:

1. **Given** a draft Ontology Version, **When** an annotation or revision is saved against it, **Then** it is rejected with `version_not_published`.
2. **Given** a published version of Project B, **When** an annotation of Project A is saved against it, **Then** it is answered as "not found" (the other project's version is not disclosed).
3. **Given** an unknown version id, **When** saving, **Then** the platform answers "not found".

---

### User Story 3 - Understand why a save was rejected (Priority: P2)

As an Annotator, I want to see the concrete reasons a save was rejected (which result, which rule), so that I can fix the labels instead of seeing a generic "request failed" message.

**Why this priority**: Validation without feedback blocks work; it is valuable only after Stories 1–2 exist.

**Independent Test**: Save a revision with two invalid results; the workspace shows both rule messages (first three, then "+N more").

**Acceptance Scenarios**:

1. **Given** a rejected save, **When** the response arrives, **Then** it lists **all** violations (not only the first), each with a location (`results.<n>.<field>`), a stable code and a human-readable Vietnamese message.
2. **Given** a rejected save in the workspace, **When** the error is displayed, **Then** the annotator sees the rule messages (styled as an error) instead of a transport error.
3. **Given** the workspace is bound to a draft version, **When** the annotator saves, **Then** the workspace explains that the ontology must be published first and sends nothing.

---

### User Story 4 - Same rules for every write channel (Priority: P3)

As a Platform Maintainer, I want results synced from the (legacy) Label Studio webhook to pass the same validation and revision numbering as the in-app workspace, so that no channel can bypass the ontology contract.

**Independent Test**: Send a webhook payload whose label does not exist in the version → rejected and nothing stored; a valid payload creates the next sequential revision.

**Acceptance Scenarios**:

1. **Given** a webhook payload with labels referenced by category name or key, **When** it is synced, **Then** labels are mapped to category ids and validated with the same rules as Story 1.
2. **Given** an annotation with revision 1, **When** a valid webhook arrives, **Then** revision 2 is created (no duplicate revision numbers).

### Edge Cases

- `result_type` decides *what* a result is; `output_id` only selects one output among those of that type. Editors stamp the workspace's primary output id on every result (e.g. audio transcripts carry the segment output id), so a mismatching `output_id` must not turn a transcript into a segment. Editor-specific/legacy types unknown to the catalog (e.g. `table_cell`) fall back to `output_id`.
- Two outputs of the same type in one version and a result without `output_id`: rejected as `ambiguous_output` (no guessing).
- One output wired to several inputs in a version: categories allowed are the union of that output's links.
- Tabular annotation stores all row labels in one revision: `multiple` is counted per record (`record_key`, or legacy `row` + `col_name`), not per asset.
- Tabular multi-label classification lists several category ids in `value`: every listed id is checked and stored, not only `category_id`.
- The workspace falls back to the first (draft) version when nothing is published: the workspace blocks the save with a "publish first" message instead of sending a request that will be rejected.
- `value` is checked against the output's `value_schema` only when it is a real constraint: the template seeder copies each definition's `default_schema` into `value_schema`, and that copy is a type hint, not a rule (editors send `value: ""` for audio segments and lists for tabular multi-label).
- A broken `value_schema` stored in the ontology is reported as `invalid_value_schema` instead of crashing.
- Empty `results` is a valid revision (user cleared labels).
- Validation happens before anything is persisted, so a rejected webhook never leaves an orphan annotation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every write of annotation results (create annotation, create revision, Label Studio sync) MUST validate the results against the referenced Ontology Version before persisting anything.
- **FR-002**: The system MUST accept only Ontology Versions in `published` status that belong to the annotation's project.
- **FR-003**: Each result MUST resolve to exactly one Output of the version: by `output_id` when present, otherwise by `result_type` mapped to the output definition code (`bbox → bounding_box`, `ner`/`named_entity_recognition → named_entity`). No implicit fallback is allowed.
- **FR-004**: For outputs that support categories a result MUST carry a `category_id` that is linked to that output in this version; outputs without category support MUST NOT carry one.
- **FR-005**: When an output defines `value_schema`, a non-null `value` MUST conform to it.
- **FR-006**: Results for geometric/span outputs MUST include well-formed geometry: Bounding Box (`x`,`y`,`width`,`height`), Keypoint (`x`,`y`), Polygon (≥ 3 `[x, y]` points), Named Entity / Audio Segment / Video Segment (`start` < `end`).
- **FR-007**: Outputs with `multiple = false` MUST have at most one result per annotated item.
- **FR-008**: Outputs with `required = true` MUST have at least one result whenever the revision contains results for the same input.
- **FR-009**: Rejections MUST return all violations together as a list of `{path, code, message}` while keeping the existing error envelope and status family (client error), so existing clients keep working.
- **FR-010**: Stored `category_ids` of a revision MUST be the de-duplicated, validated category ids of its results.
- **FR-011**: The Annotation Workspace MUST display the returned violation messages on a failed save and MUST block saving against a draft version with an explanation.
- **FR-012**: Webhook-synced revisions MUST use the same sequential revision numbering as in-app revisions.

### Key Entities *(include if feature involves data)*

- **Ontology Version (contract)**: published, immutable composition of Inputs → Outputs → Categories; supplies output type, `multiple`, `required`, `value_schema`, and linked categories.
- **Annotation Result**: one item inside a revision: `output_id` and/or `result_type`, optional `category_id`, `value`, `geometry`.
- **Validation Issue**: `{path, code, message}` describing one violated rule; same shape as Ontology version validation issues.
- **Validation Report**: list of issues plus the validated category ids.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the rule scenarios in User Stories 1, 2 and 4 are covered by automated tests and pass.
- **SC-002**: 0 annotation revisions can be stored against a draft or foreign Ontology Version through any channel.
- **SC-003**: All payload shapes produced by the current workspace editors that have a catalog output definition (bounding box, polygon, keypoint, classification, named entity, text, number, audio/video segments, tabular rows incl. multi-label) are accepted when they conform to the published version.
- **SC-004**: A rejected save shows the annotator every violated rule (up to 3 inline + count of the rest) in one attempt.
- **SC-005**: The existing annotation test suites (`test_annotation_validator_unit`, `test_tabular_annotation_format`, `test_annotation_full`) pass after being updated to the stricter contract.

## Assumptions

- Ontology rules are those already enforced at publish time by `modules/ontology/domain/validators.py` and documented in `docs/ontology.md`; this feature consumes them, it does not change ontology authoring.
- Annotation (not Ontology) owns result validation rules; Ontology only provides the version contract (per `docs/ontology.md`: Ontology does not own annotation results).
- Error status stays HTTP 400 (`BadRequestException` family) to avoid a breaking change for the frontend; detailed issues are added under `error.details.issues`.
- Category references in the public API are ids; name/key mapping is only performed for the Label Studio adapter.
- Results for output types without a catalog definition (e.g. `brush_mask`) are accepted only if the ontology defines such an output; otherwise they are rejected as `unknown_output`.
- Definition `default_schema` type hints are not enforced on `value` until the editors are aligned with them (tracked as follow-up).
- Label Studio is a legacy channel: a webhook that violates the contract is logged and not stored (Label Studio keeps the original annotation), instead of failing the webhook call.
- Prerequisite: the application must start on `dev`. Regressions introduced by commit `4fc115e` (identity imports, DI bindings, user-id DTO typing) are fixed minimally as a foundational task, without further refactoring. *(Superseded 2026-11-08: fixed upstream on `dev` by `87ec4e2`.)*
- `.specify/memory/constitution.md` has not been ratified yet; the Constitution Check uses `AGENTS.md`, `.agent/rules/GEMINI.md`, the backend-development skill and spec 001 principles as gates.
