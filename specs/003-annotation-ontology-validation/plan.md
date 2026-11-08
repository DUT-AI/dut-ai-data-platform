# Implementation Plan: Annotation Validation Against Ontology Version

**Branch**: `feat/integrate_ontology_annotation_validation` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-annotation-ontology-validation/spec.md`

## Summary

Every write of annotation results (create annotation, create revision, Label Studio webhook) is checked against the referenced **published** Ontology Version of the same project before anything is persisted.

A pure Annotation-domain function collects all violations (output resolution, categories per output, value schema, geometry per output type, `multiple`, `required`). The API returns them under `error.details.issues`, and the workspace shows them and blocks saves against draft versions.

## Technical Context

- **Language/Version**: Python 3.12 (backend), TypeScript / Next.js (web)
- **Primary Dependencies**: FastAPI, Dishka, SQLAlchemy async, Pydantic v2, `jsonschema` (already a dependency); axios on the web side
- **Storage**: PostgreSQL. No schema change; revisions keep `results` as JSON plus `category_ids`.
- **Testing**: pytest + pytest-asyncio (SQLite in-memory through `tests/conftest.py`); eslint, tsc and `next build` for the web
- **Target Platform**: Linux containers (docker-compose); dev on Windows
- **Project Type**: Web application, a modular monolith (`modules/*`) plus the `web/` frontend
- **Performance Goals**: Validation is O(results + outputs) in memory, with one version load and one ontology load per write. Nothing is user-noticeable.
- **Constraints**: The error envelope stays backward compatible (HTTP 400, same `error.code`/`error.message`). No database migration.
- **Scale/Scope**: About 25 files touched; 1 new domain module, 1 new exception module, 1 new web util and 1 new test module.

## Constitution Check

`.specify/memory/constitution.md` is still the unratified template. The gates below come from `AGENTS.md`, `.agent/rules/GEMINI.md`, `.agent/skills/backend-development/SKILL.md`, the frontend rulebook (`.agent/rules/frontend-design/`) and spec 001.

| Gate | Status | Evidence |
|---|---|---|
| The domain layer stays pure (no FastAPI/Pydantic/SQLAlchemy) | PASS | `result_validation.py` imports only the stdlib, `jsonschema` and ontology domain entities; `test_clean_architecture_purity` passes |
| Use cases depend on Protocol interfaces | PASS | the helper takes `IOntologyRepository`; no concrete repository is used |
| Business rules are not in repositories | PASS | the rules live in `modules/annotation/domain/result_validation.py`; revision numbering stays where `dev` has it (entity in-app, repository for the webhook) |
| Cross-module coupling does not grow | PASS (justified) | annotation already depended on `IOntologyRepository` and ontology entities; no new foreign repository. A dedicated contract port is deferred to spec 001 FR-004 |
| Errors are not swallowed silently | PASS | the API returns every issue; the webhook logs the issues before skipping |
| Frontend rulebook: Purpose Gate, color contract, no `alert`, no `transition-all`, scoped prettier/eslint/tsc/build | PASS | see `quickstart.md` §4; error banner uses rose + `role="alert"` |
| Frontend rulebook: 390/1440 px visual pass | NOT RUN | banner layout unchanged (same absolute container); to verify in a browser at review |

## Project Structure

### Documentation (this feature)

```text
specs/003-annotation-ontology-validation/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/annotation-validation-error.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
core/exceptions/
├── base.py                      # DomainException.details (optional)
└── handlers.py                  # emits error.details when present
modules/annotation/
├── domain/
│   ├── result_validation.py     # NEW pure rules + AnnotationIssue/Report
│   └── exceptions.py            # NEW AnnotationValidationError
├── services/annotation_validator.py   # wrapper + load_annotatable_version
├── use_cases/{create_annotation,create_revision,label_studio}.py
web/src/features/annotation/
├── utils/api-error.ts           # NEW issue → message
└── components/annotation-workspace-view.tsx   # draft guard + error banner
tests/
├── unit/test_annotation_result_validation.py  # NEW
├── test_annotation_validator_unit.py, test_tabular_annotation_format.py, test_annotation_full.py
# Foundational fixes for 4fc115e: superseded by dev 87ec4e2 (see tasks.md Phase 8)
```

**Structure Decision**: Follow the existing module layout (`domain/`, `services/`, `use_cases/`, `dtos/`). New rules go in `modules/annotation/domain/` and are wired through the existing services and use cases. No new DI registrations are needed for the feature.

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| ~~Foundational fixes outside annotation~~ | Superseded: `dev` `87ec4e2` fixed them upstream; dropped on rebase | — |
| Result-type/output-id resolution rule (R2) | The workspace stamps the primary output id on every result | Authoritative `output_id` rejects valid transcripts; requiring `output_id` breaks the vision editors |
