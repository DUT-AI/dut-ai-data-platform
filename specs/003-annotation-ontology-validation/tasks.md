---

description: "Task list for annotation validation against Ontology Version"
---

# Tasks: Annotation Validation Against Ontology Version

**Input**: Design documents from `/specs/003-annotation-ontology-validation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included. The spec's success criteria (SC-001, SC-003, SC-005) require automated rule coverage.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: The user story the task belongs to (US1–US4)

---

## Phase 1: Setup

- [X] T001 Create the feature branch `feat/integrate_ontology_annotation_validation` from `dev` and register `specs/003-annotation-ontology-validation` in `.specify/feature.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `dev` cannot import `apps.api.main` (regressions from `4fc115e`), so no API test can run.

> **Superseded (2026-11-08)**: `dev` (`87ec4e2`, spec `002-fix-clean-code-smells`) fixed the same regressions upstream. After the rebase (Phase 8), T002–T006 are dropped in favor of the `dev` versions. Only the feature code remains on this branch.

- [X] T002 [P] Re-point `AuthUser`/`TokenResponse` imports to `modules/identity/dtos/auth_dtos.py` in `modules/identity/__init__.py`, `modules/identity/domain/__init__.py`, `modules/identity/use_cases/get_me.py`, `apps/api/deps/roles.py`, `apps/api/routers/identity.py` and `tests/*.py`
- [X] T003 [P] Bind `IAuthClient` to the `AuthClient` instance in `modules/identity/di.py`
- [X] T004 [P] Declare `seeder: IOntologyTemplateSeederService` (not `| None`) in `modules/ontology/use_cases/ontologies.py`
- [X] T005 [P] Convert user ids `int → str` in `ProjectResponseDTO`/`ProjectMemberResponseDTO` (`modules/project/dtos/project_dtos.py`)
- [X] T006 Add optional `details` to `DomainException` and emit `error.details` in `core/exceptions/base.py` and `core/exceptions/handlers.py`

**Checkpoint**: `python -c "import apps.api.main"` succeeds.

---

## Phase 3: User Story 1 - Reject results that break the Ontology contract (P1) 🎯 MVP

**Goal**: Results are validated per output: resolution, categories, value schema, geometry, `multiple`, `required`.

**Independent Test**: `tests/unit/test_annotation_result_validation.py`

- [X] T007 [P] [US1] Write the rule tests in `tests/unit/test_annotation_result_validation.py` (aliases, unknown/ambiguous output, editor-stamped output id, legacy type, categories, multi-label, value schema incl. seeded copy, geometry matrix, multiple per record, required per input, collect-all)
- [X] T008 [US1] Implement `AnnotationIssue`, `ResultValidationReport` and `validate_annotation_results` in `modules/annotation/domain/result_validation.py`
- [X] T009 [US1] Add `AnnotationValidationError(BadRequestException)` with `issues` + `details` in `modules/annotation/domain/exceptions.py`
- [X] T010 [US1] Rewrite `AnnotationValidator.validate_results` as a thin wrapper in `modules/annotation/services/annotation_validator.py`
- [X] T011 [US1] Update `tests/test_annotation_validator_unit.py` and `tests/test_tabular_annotation_format.py` to the issue-code contract

---

## Phase 4: User Story 2 - Published version of the same project only (P1)

**Goal**: Writes against a draft version are rejected; a foreign or missing version gives 404.

**Independent Test**: The version-guard tests in `tests/unit/test_annotation_result_validation.py`, and step 5b of `tests/test_annotation_full.py`

- [X] T012 [US2] Implement `load_annotatable_version(onto_repo, version_id, project_id)` in `modules/annotation/services/annotation_validator.py`
- [X] T013 [US2] Use it in `modules/annotation/use_cases/create_annotation.py` and `modules/annotation/use_cases/create_revision.py`
- [X] T014 [US2] Convert `created_by` `int → str` in the annotation response DTOs (`modules/annotation/dtos/annotation_dtos.py`) *(dropped on rebase: `dev` keeps `int`; see T026)*
- [X] T015 [US2] Extend `tests/test_annotation_full.py`: a rejected payload leaves nothing persisted, a foreign project gets 404, and the valid flow still works

---

## Phase 5: User Story 3 - Understand why a save was rejected (P2)

**Goal**: The workspace shows the backend issues and blocks draft saves.

**Independent Test**: The manual steps in `quickstart.md` §3

- [X] T016 [P] [US3] Add `getAnnotationSaveErrorMessage` in `web/src/features/annotation/utils/api-error.ts`
- [X] T017 [US3] In `web/src/features/annotation/components/annotation-workspace-view.tsx`: add the draft guard, show the issue messages, and use an error-tone banner (rose, `role="alert"`)
- [X] T018 [US3] Pass prettier, eslint, `tsc --noEmit` and `next build` on the web (`quickstart.md` §4)
- [ ] T019 [US3] Manual browser pass at 390 px and 1440 px (`quickstart.md` §3), left for review

---

## Phase 6: User Story 4 - Same rules for every write channel (P3)

**Goal**: The Label Studio webhook validates, maps labels, and numbers revisions sequentially.

**Independent Test**: Steps 9–10 of `tests/test_annotation_full.py`

- [X] T020 [US4] In `modules/annotation/use_cases/label_studio.py`: load the version through the guard, map labels key→name→id, validate before creating anything, and on a violation log and return `None` (numbering is left to the repository, see T028)
- [X] T021 [US4] Cover the key mapping, the sequential revision number and a rejected label in `tests/test_annotation_full.py`

---

## Phase 7: Polish & Cross-Cutting

- [X] T022 Run `ruff check` and `ruff format` on the touched backend files
- [X] T023 Run the full suite. Result: 147 passed, 3 failed. The failures predate this feature and come from `4fc115e`: `test_project_management_unit` (string user id `"u1"`), `test_ontology_seeder` (mock arity), `test_worker_callback_grpc` (async storage). They are out of scope.
- [ ] T024 Ratify `.specify/memory/constitution.md` with the club lead (follow-up)

---

## Phase 8: Rebase on `dev` (2026-11-08)

**Purpose**: Bring in `dev` up to `23bc357` (clean-code-smells `87ec4e2`, prettier `a5efb70`, workflow domain `d464903`) without changing the behavior of this feature.

- [X] T025 Rebase the branch onto `origin/dev`. The branch had no commits of its own, so this was a fast-forward to `23bc357` with the feature changes re-applied on top
- [X] T026 Drop T002–T006 and take the `dev` versions of the shared files. `dev` re-exports `AuthUser`/`TokenResponse` from `modules/identity/domain/entities.py`, binds `IAuthClient`, adds `details` to `DomainException` with MRO-based HTTP mapping in `core/exceptions/handlers.py`, and keeps user ids as `int` in the project/annotation DTOs (so T014 is dropped too)
- [X] T027 Pass the issues through `DomainException(message, details=...)` in `modules/annotation/domain/exceptions.py`. `BadRequestException` is now an alias of `BusinessRuleViolationError` and still maps to HTTP 400
- [X] T028 Resolve `modules/annotation/use_cases/label_studio.py`. Keep `dev`'s revision creation (`AnnotationRevisionEntity(revision_number=0)`; the repository assigns `max + 1`) and its `SYSTEM_USER_ID` author fallback. Add only what validation needs: the guarded version load, the label → category-id mapping (key, then name), and validation before anything is persisted
- [X] T029 Resolve `web/src/features/annotation/components/annotation-workspace-view.tsx` on top of the `dev` version (workflow review flow untouched, no reformatting). Keep `feedbackMsg`, derive the error tone from the `Lỗi` prefix, add the draft guard, and show the backend issues through `getAnnotationSaveErrorMessage`
- [X] T030 Rename the spec folder `002-annotation-ontology-validation` → `003-annotation-ontology-validation`, because `dev` already uses `002-*` twice
- [X] T031 Validate. Backend: `import apps.api.main` works, `ruff check` is clean, the feature suites pass (37/37), and the full suite gives 157 passed, 1 failed. Web: prettier, eslint (0 errors), `tsc --noEmit` and `next build` all pass
- [ ] T032 Report upstream: `tests/modules/workflow/unit/test_create_batch_work_items.py::test_create_batch_missing_workflow_raises` also fails on a clean `dev`. `CreateBatchWorkItemsUseCase` now creates a default workflow instead of raising `WorkflowDefinitionNotFoundError`. This belongs to the workflow module and is out of scope here
- [X] T033 Check the shared dev DB over Tailscale. It is already at `013_create_workflow_domain_tables` (head), so no upgrade is needed

---

## Phase 9: End-to-end run on the shared dev DB (2026-11-08)

**Purpose**: Run the feature in the browser against `data_platform_dev`, using a dedicated test project and user, and confirm it works on the real data model.

- [X] T034 Strip the trailing punctuation from issue messages before joining them in `web/src/features/annotation/utils/api-error.ts` (the banner showed a doubled `.;`)
- [X] T035 Validate end to end:
  - A draft save is blocked in the workspace, and the API answers 400 `version_not_published`.
  - Publish → a valid save creates r1. A tampered payload returns 400 with `geometry_invalid`, `category_not_allowed` and `unknown_output`, and creates no revision. A valid re-save creates r2 (later r3 via the API).
  - In the DB: `category_ids` de-duplicated, revision numbers sequential.
  - Backend: 157 passed, 1 failed (T032, workflow, pre-existing on `dev`). Web: `tsc` and `next build` pass.
- [X] T036 Keep this branch limited to the feature. These problems surfaced during the run but are **not part of this feature**; they are reported to the club lead and not committed here:
  - (a) `dev` `87ec4e2` maps user-id columns as `Integer` while the DB columns are `VARCHAR` with legacy values, so `GET /projects` returns 500 (`character varying = integer`). Annotation endpoints are not affected. A possible fix is a `UserIdString` column type or a migration; the lead decides.
  - (b) The template seeder creates Inputs without `input_schema.allowed_extensions`. The ontology canvas crashes (`.join` on undefined), and publish validation fails (`extensions_required`) until the Input is edited. With this feature, annotation requires a published version, so template projects must fix the Input before they can annotate.
  - (c) The API returns `created_by` as `int`, but the FE History tab calls `created_by.split`, so the tab crashes.
- [ ] T037 Follow-up (UX): the workspace feedback banner (`absolute top-3`) covers the label bar

---

## Dependencies & Execution Order

- Phase 2 blocks every story; T006 blocks T009. (Phase 2 was superseded by `dev`; see Phase 8.)
- US1 (T007–T011) blocks US2 (it reuses the error type), US3 (the error contract) and US4 (the validator).
- US3 and US4 are independent of each other once US1 and US2 are done.

## Parallel Examples

- T002–T005 touch different files: run them in parallel.
- T007 (tests) can be written while T008 is designed; run T007 first (it should fail), then T008.
- T016 can be done in parallel with T020.

## Implementation Strategy

1. MVP = Phase 2 + US1 + US2. Every API write is now contract-safe.
2. Add US3 (annotator feedback), then US4 (legacy channel).
3. Commits after the rebase: (a) `feat(annotation):` T007–T021 + T027–T029 + T034; (b) `docs(specs):` spec 003. There is no separate `fix:` commit any more, because `dev` already contains it.
