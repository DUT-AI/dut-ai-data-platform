# Tasks: Backend Clean Architecture & SOLID Refactoring

**Input**: Design documents from `specs/001-backend-clean-architecture-solid/` (`spec.md`, `plan.md`, `data-model.md`, `research.md`, `contracts/domain-interfaces.md`, `quickstart.md`)

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `data-model.md`, `contracts/`

**Tests**: Test tasks are included per the spec requirements to ensure zero regressions across the 111 existing automated tests and architectural purity gates.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Exact file paths are provided in all descriptions

---

## Phase 1: Setup (Shared Infrastructure & Baseline Verification)

**Purpose**: Verify the existing test suite baseline and configure architectural purity verification gates.

- [x] T001 Verify existing test suite baseline by running `uv run pytest tests/ -q` to confirm all 111 tests pass before refactoring begins
- [x] T002 [P] Create architectural purity test gate script in `tests/test_clean_architecture_purity.py` checking zero imports of `pydantic`, `fastapi`, and `sqlalchemy` in all `modules/*/domain/entities.py`
- [x] T003 [P] Define core asynchronous storage interface contract `IStorageProvider` in `core/storage/interface.py` with methods `upload`, `generate_presigned_download_url`, and `generate_presigned_upload_url`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure and identity typing prerequisites that MUST be complete before user stories are implemented.

**⚠️ CRITICAL**: Foundational tasks must complete before user story implementation begins.

- [x] T004 Standardize user identity extraction in `apps/api/deps/auth.py` by converting `sub` claim strictly to integer `user_id = int(payload["sub"])` and typing `CurrentUser.id: int`
- [x] T005 [P] Create external auth transport data transfer objects `TokenResponseDTO` and `AuthUserDTO` in `modules/identity/dtos/auth_dtos.py`
- [x] T006 [P] Define abstract authentication client protocol `IAuthClient` in `modules/identity/domain/interfaces.py` with methods `login`, `get_me`, and `list_users`
- [x] T007 Define standard typed domain exceptions (`DomainError`, `EntityNotFoundError`, `InvariantViolationError`, `StorageUploadError`) in `core/exceptions.py`

**Checkpoint**: Foundation ready - User Story 1, 2, and 3 implementation can proceed.

---

## Phase 3: User Story 1 - Pure Domain Models & Business Invariant Enforcement (Priority: P1) 🎯 MVP

**Goal**: Establish pure Python domain entities across all modules (`identity`, `project`, `dataset`, `ontology`, `annotation`, `inference`), rich aggregate roots (`AnnotationEntity` with `add_revision()`, `DatasetEntity` with version immutability), and strictly typed `user_id: int`.

**Independent Test**: Unit test domain entities in isolation via `tests/unit/test_domain_purity_and_invariants.py` with zero I/O, validating zero framework imports, invariant enforcement (`AnnotationEntity.add_revision`), version immutability rules, and integer user IDs.

### Tests for User Story 1

- [x] T008 [P] [US1] Create domain unit tests in `tests/unit/test_domain_purity_and_invariants.py` testing `AnnotationEntity.add_revision()` sequential numbers, `DatasetVersionEntity` published immutability, and zero framework imports

### Implementation for User Story 1

- [x] T009 [P] [US1] Refactor `modules/identity/domain/entities.py` into pure Python dataclasses with `UserEntity(id: int, email: str, name: str | None = None, role: str = "user", avatar_url: str | None = None, status: str = "ACTIVE")` and `UserLoginMetadataEntity(user_id: int, last_login_at: datetime)` removing Pydantic and FastAPI imports
- [x] T010 [P] [US1] Refactor `modules/annotation/domain/entities.py` into a rich Aggregate Root with `AnnotationEntity(id: str, asset_id: str, project_id: str, created_by: int, target_type: SelectorType = "FULL_ASSET", target_selector: dict[str, Any] = field(default_factory=dict), ontology_version_id: str | None = None, revisions: list[AnnotationRevisionEntity] = field(default_factory=list))` and method `add_revision(source: RevisionSource, results: list[dict[str, Any]], category_ids: list[str], created_by: int, ontology_version_id: str | None = None) -> AnnotationRevisionEntity` ensuring `revision_number` increments sequentially
- [x] T011 [P] [US1] Update `modules/annotation/repository/annotation_repository.py` to remove SQL max revision computation and persist aggregate-derived `revision_number` directly from `AnnotationRevisionEntity`
- [x] T012 [P] [US1] Refactor `modules/project/domain/entities.py` to standardize `ProjectEntity(created_by: int)` with property `owner_id: int`, and `ProjectMemberEntity(project_id: str, user_id: int, role: str)`
- [x] T013 [P] [US1] Refactor `modules/dataset/domain/entities.py` to standardize `created_by: int | None` on `AssetEntity` and `DatasetEntity`, and enforce immutability checks on published `DatasetVersionEntity`
- [x] T014 [US1] Update `modules/annotation/use_cases/create_annotation.py` and `modules/annotation/use_cases/create_revision.py` to call `AnnotationEntity.add_revision()` instead of manual revision calculation
- [x] T015 [US1] Update `modules/identity/use_cases/login.py` and `modules/identity/infrastructure/auth_client.py` to implement `IAuthClient` and return `TokenResponseDTO`
- [x] T016 [US1] Verify regression tests for User Story 1 by running `uv run pytest tests/test_annotations.py tests/test_identity.py tests/test_projects.py`

**Checkpoint**: At this point, User Story 1 is fully functional, domain entities are pure, and all invariants are encapsulated.

---

## Phase 4: User Story 2 - Decoupled Cross-Module Interactions via Events & Facades (Priority: P2)

**Goal**: Decouple high-arity use cases (`CreateOntologyUseCase`) down to <= 3 constructor dependencies by extracting `OntologyTemplateSeederService`, and publish `ProjectCreatedEvent` to the Transactional Outbox.

**Independent Test**: Unit and transaction rollback tests in `tests/unit/test_ontology_seeder.py` verifying template seeding in an isolated mock context and transaction rollback on failure without cross-table leaks.

### Tests for User Story 2

- [x] T017 [P] [US2] Create unit and transaction rollback tests for ontology template seeding in `tests/unit/test_ontology_seeder.py` verifying atomic rollback upon seeding failure

### Implementation for User Story 2

- [x] T018 [P] [US2] Define `IOntologyTemplateSeederService` protocol in `modules/ontology/domain/interfaces.py` with method `seed_from_project_template(project_id: str, ontology: OntologyEntity, draft_version: OntologyVersionEntity) -> None`
- [x] T019 [US2] Implement `OntologyTemplateSeederService` in `modules/ontology/services/seeder.py` encapsulating template lookup, input/output mappings, and category creation inside atomic database transaction with explicit rollback on error
- [x] T020 [US2] Refactor `CreateOntologyUseCase` in `modules/ontology/use_cases/ontologies.py` constructor to accept at most 3 dependencies: `IOntologyRepository`, `IOntologyVersionRepository`, and `IOntologyTemplateSeederService`
- [x] T021 [US2] Update `modules/ontology/di.py` to register `OntologyTemplateSeederService` and provide it to `CreateOntologyUseCase`
- [x] T022 [US2] Refactor `modules/project/use_cases/create_project.py` to record `ProjectCreatedEvent` to Transactional Outbox via `core/events/outbox.py` for decoupled cross-module notification
- [x] T023 [US2] Verify regression tests for User Story 2 by running `uv run pytest tests/test_ontology_routes.py tests/test_projects.py`

**Checkpoint**: At this point, User Stories 1 AND 2 work independently, and ontology creation has low constructor arity.

---

## Phase 5: User Story 3 - Strict Dependency Inversion & Resilient Infrastructure Adapters (Priority: P3)

**Goal**: Enforce dependency inversion on S3 storage with async `IStorageProvider`, eliminate silent error suppression / fake S3 URIs, register `InferenceProvider` in root DI, and partition `dataset_use_cases.py` (660 lines) into discrete single-responsibility files.

**Independent Test**: Unit test in `tests/unit/test_s3_prediction_storage.py` verifying that storage failures raise `StorageUploadError` without returning fallback URIs, and verify all dataset use case imports resolve correctly.

### Tests for User Story 3

- [x] T024 [P] [US3] Create storage error propagation and DI resolution tests in `tests/unit/test_s3_prediction_storage.py` verifying `StorageUploadError` propagation and zero fake S3 URIs
- [x] T025 [P] [US3] Refactor `modules/inference/infrastructure/storage/prediction_storage.py` to inject abstract `IStorageProvider`, use `await self._storage_provider.upload(...)`, and raise typed `StorageUploadError` instead of returning fake mock URIs
- [x] T026 [P] [US3] Create `InferenceProvider` in `modules/inference/infrastructure/di/provider.py` and register it in root Dishka container in `apps/api/di.py`
- [x] T027 [US3] Update `apps/ai_worker/main.py` to resolve `S3PredictionStorage` and inference clients via the Dishka DI container
- [x] T028 [P] [US3] Partition dataset query operations from `modules/dataset/use_cases/dataset_use_cases.py` into `modules/dataset/use_cases/create_dataset.py`, `modules/dataset/use_cases/list_project_datasets.py`, `modules/dataset/use_cases/get_dataset_detail.py`, `modules/dataset/use_cases/update_dataset.py`, and `modules/dataset/use_cases/delete_dataset.py`
- [x] T029 [P] [US3] Partition dataset version operations from `modules/dataset/use_cases/dataset_use_cases.py` into `modules/dataset/use_cases/create_dataset_version.py`, `modules/dataset/use_cases/list_dataset_versions.py`, `modules/dataset/use_cases/get_dataset_version_detail.py`, and `modules/dataset/use_cases/publish_dataset_version.py`
- [x] T030 [P] [US3] Partition dataset asset operations from `modules/dataset/use_cases/dataset_use_cases.py` into `modules/dataset/use_cases/upload_version_assets.py`, `modules/dataset/use_cases/finalize_asset_import.py`, `modules/dataset/use_cases/inherit_dataset_version.py`, and `modules/dataset/use_cases/download_asset.py`
- [x] T031 [US3] Re-export all partitioned use cases in `modules/dataset/use_cases/__init__.py` and remove deprecated `modules/dataset/use_cases/dataset_use_cases.py` ensuring complete backwards compatibility with routers and tests
- [x] T032 [US3] Verify regression tests for User Story 3 by running `uv run pytest tests/test_dataset_routes.py tests/test_worker_callback_grpc.py`

**Checkpoint**: All three user stories are complete, S3 adapter adheres to DIP, and god files are partitioned into cohesive modules.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation gates, linting, formatting, and final quality checks across all refactored modules.

- [x] T033 Execute domain purity verification script per `quickstart.md` section 3.1 to verify zero framework imports in domain entities
- [x] T034 Execute full regression test suite validation via `uv run pytest tests/ -q` ensuring 100% pass rate (all 111+ tests pass)
- [x] T035 [P] Run code formatting and linting via `uv run ruff check apps/ modules/ core/` and `uv run ruff format --check apps/ modules/ core/`
- [x] T036 Update architectural validation checklist in `specs/001-backend-clean-architecture-solid/checklists/requirements.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - executes immediately to confirm test baseline
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational phase completion
  - **User Story 1 (P1)**: Can start after Foundational (Phase 2)
  - **User Story 2 (P2)**: Can start after Foundational (Phase 2); integrates with Project and Outbox
  - **User Story 3 (P3)**: Can start after Foundational (Phase 2); refactors S3 storage and partitions dataset use cases
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Core domain purity and aggregate invariants; no dependencies on US2/US3
- **User Story 2 (P2)**: Depends on pure domain entities from US1 for `OntologyEntity` and `ProjectEntity`
- **User Story 3 (P3)**: Depends on pure domain entities from US1 for `AssetEntity` and `DatasetEntity`

### Within Each User Story

- Unit tests written first to establish independent test criteria
- Entity models updated before use cases
- Use cases updated before DI providers and routers
- Verification test run before completing the story phase

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel
- **Phase 2**: T005 and T006 can run in parallel
- **Phase 3 (US1)**: T008, T009, T010, T011, T012, and T013 can run in parallel across different module directories
- **Phase 4 (US2)**: T017 and T018 can run in parallel
- **Phase 5 (US3)**: T024, T025, T026, T028, T029, and T030 can run in parallel across different files
- **Phase 6**: T035 can run in parallel with documentation checks

---

## Parallel Example: User Story 1

```bash
# Launch domain entity refactoring for User Story 1 across independent modules in parallel:
Task T009: "modules/identity/domain/entities.py"
Task T010: "modules/annotation/domain/entities.py"
Task T012: "modules/project/domain/entities.py"
Task T013: "modules/dataset/domain/entities.py"
```

## Parallel Example: User Story 3

```bash
# Launch dataset use case partitioning in parallel:
Task T028: "modules/dataset/use_cases/create_dataset.py", "get_dataset_detail.py", etc.
Task T029: "modules/dataset/use_cases/create_dataset_version.py", "publish_dataset_version.py", etc.
Task T030: "modules/dataset/use_cases/upload_version_assets.py", "download_asset.py", etc.
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify baseline 111 tests pass)
2. Complete Phase 2: Foundational (standardize `user_id: int` extraction and auth DTOs)
3. Complete Phase 3: User Story 1 (pure domain entities and aggregate invariants)
4. **STOP and VALIDATE**: Run `uv run pytest tests/` and domain purity gate check
5. Deploy/review core domain foundation

### Incremental Delivery

1. Setup + Foundational → Foundation established
2. User Story 1 → Pure Domain Models & Rich Aggregates (MVP!)
3. User Story 2 → Decoupled Ontology Seeding & Outbox Events
4. User Story 3 → Async S3 Storage & Modular Dataset Use Cases
5. Polish → Purity gates, full regression check (111+ tests passing), and ruff linting
