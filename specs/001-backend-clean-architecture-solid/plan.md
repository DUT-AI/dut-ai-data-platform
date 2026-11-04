# Implementation Plan: Backend Clean Architecture & SOLID Refactoring

**Branch**: `001-backend-clean-architecture-solid` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-backend-clean-architecture-solid/spec.md` with explicit user constraint: `user_id` is strictly `int`.

## Summary

Refactor the DUT AI Data Platform backend codebase across its 6 modules (`identity`, `project`, `dataset`, `ontology`, `annotation`, `inference`) to conform to Clean Architecture and SOLID principles. The refactoring establishes pure Python domain entities, converts anemic data holders into rich aggregate roots (such as `AnnotationEntity`), decouples bloated use cases through dedicated domain services (e.g. `OntologyTemplateSeederService`), enforces dependency inversion with asynchronous storage interfaces, eliminates silent error suppression, standardizes `user_id` strictly as `int`, and partitions god files into single-responsibility use case modules while maintaining 100% pass rate on all 111 existing automated tests.

## Technical Context

**Language/Version**: Python 3.12+

**Primary Dependencies**: FastAPI, Dishka DI, SQLAlchemy 2.0 (asyncpg), aio_pika, Pydantic v2, Loguru

**Storage**: PostgreSQL 16+ (asyncpg), MinIO / S3 Object Storage, Redis 7+

**Testing**: pytest, pytest-asyncio, aiosqlite (for in-memory test suites)

**Target Platform**: Linux / macOS containerized (Docker Compose)

**Project Type**: Modular Monolith Web API (`apps/api`), Background Worker (`apps/worker`), and GPU AI Worker (`apps/ai_worker`)

**Performance Goals**: Non-blocking asynchronous I/O across all endpoints; elimination of blocking synchronous storage operations in async workers.

**Constraints**:
- Domain Layer (`modules/*/domain/`) must be pure Python with zero imports from `pydantic`, `fastapi`, or `sqlalchemy`.
- User identifiers (`user_id`, `created_by`, `owner_id`) are strictly typed as `int`.
- Platform resource identifiers (`project_id`, `dataset_id`, `asset_id`, `annotation_id`, `ontology_id`) remain ULID `str`.
- All 111 existing unit/integration tests must pass continuously without regressions.

**Scale/Scope**: 6 modules, 4 application entrypoints (`api`, `worker`, `ai_worker`, `cli`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Domain Purity**: Domain entities are pure Python classes/dataclasses without external framework imports.
- [x] **Dependency Inversion**: Use cases depend on abstract `typing.Protocol` interfaces, never on concrete clients or SQL models.
- [x] **Single Responsibility**: Multi-use-case files partitioned into single-use-case files; constructor dependencies limited to <= 3-4 per class.
- [x] **No Silent Failures**: Infrastructure adapters propagate typed exceptions instead of returning fake mock URIs.
- [x] **Test Integrity**: Test suite passing verified prior to and required after every phase.

## Project Structure

### Documentation (this feature)

```text
specs/001-backend-clean-architecture-solid/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Architectural decisions & research findings
├── data-model.md        # Domain entities, aggregate roots, & identity types
├── quickstart.md        # Validation commands & architectural test gates
├── contracts/           # Domain interface contracts (typing.Protocol)
│   └── domain-interfaces.md
└── checklists/
    └── requirements.md  # Quality validation checklist
```

### Source Code Organization

```text
apps/
├── api/                         # FastAPI entrypoint, routers, and health checks
│   ├── deps/auth.py             # Authentication dependencies (extracts int user_id)
│   ├── di.py                    # Root Dishka Container registering all module providers
│   └── main.py                  # ASGI Application
├── worker/main.py               # Outbox Processor & AMQP Background Worker
└── ai_worker/main.py            # GPU/Inference AMQP Worker

core/
├── database/                    # AsyncSessionLocal & DatabaseProvider
├── storage/                     # IStorageProvider interface & MinIO adapter
└── events/                      # Transactional Outbox models & processor

modules/
├── identity/                    # User identity & authentication
│   ├── domain/entities.py       # Pure UserEntity & UserLoginMetadataEntity (user_id: int)
│   ├── dtos/auth_dtos.py        # TokenResponseDTO, AuthUserDTO
│   └── use_cases/login.py       # LoginUseCase with IAuthClient interface
├── annotation/                  # Annotations & Revisions
│   ├── domain/entities.py       # AnnotationEntity (Aggregate Root) & AnnotationRevisionEntity
│   ├── repository/              # Pure persistence repository (0 revision sequence logic)
│   └── use_cases/               # CreateAnnotation, CreateRevision
├── ontology/                    # Ontologies, Categories, Tools
│   ├── services/seeder.py       # OntologyTemplateSeederService (decoupled template seeding)
│   └── use_cases/ontologies.py  # CreateOntologyUseCase (<= 3 dependencies)
├── dataset/                     # Datasets, Versions, Assets
│   └── use_cases/               # Partitioned single use-case files
│       ├── create_dataset.py
│       ├── publish_dataset_version.py
│       ├── upload_version_assets.py
│       └── ...
└── inference/                   # Model execution & prediction storage
    ├── infrastructure/
    │   ├── storage/prediction_storage.py  # Async IStorageProvider adapter (0 fake fallback)
    │   └── di/provider.py                 # InferenceProvider (registered in root di.py)
    └── application/use_cases/             # ExecuteInferenceUseCase
```

## Implementation Phases & Work Breakdown

### Phase 1: Domain Purity & Standardized User ID (`int`)
1. **`modules/identity`**:
   - Move `TokenResponse` and `AuthUser` out of `domain/entities.py` into `dtos/auth_dtos.py` as DTOs.
   - Ensure `UserEntity.id: int` and `UserLoginMetadataEntity.user_id: int`.
   - Update `apps/api/deps/auth.py` to extract `int` directly: `user_id = int(payload["sub"])`.
2. **`modules/annotation`**:
   - Refactor `AnnotationEntity` to become a rich Aggregate Root with `add_revision(...)`.
   - Set `created_by: int` across `AnnotationEntity` and `AnnotationRevisionEntity`.
   - Remove revision number computation query from `SqlAnnotationRepository.create_revision`.
3. **`modules/project`**:
   - Standardize `ProjectEntity.created_by: int`, `ProjectMemberEntity.user_id: int`, and `owner_id: int`.
4. Run `uv run pytest tests/` to verify zero regression.

### Phase 2: Decouple High-Arity Use Cases (`modules/ontology`)
1. Extract `seed_ontology_from_template` into `OntologyTemplateSeederService`.
2. Refactor `CreateOntologyUseCase` constructor to accept only `IOntologyRepository`, `IOntologyVersionRepository`, and `OntologyTemplateSeederService`.
3. Wrap seeding in atomic database transaction with explicit rollback upon error.
4. Run `uv run pytest tests/` to verify ontology tests pass.

### Phase 3: Infrastructure Hardening & Async Dependency Inversion (`modules/inference`)
1. Refactor `S3PredictionStorage` in `modules/inference/infrastructure/storage/prediction_storage.py`:
   - Inject abstract `IStorageProvider`.
   - Replace blocking `client.put_object` with `await self._storage_provider.upload(...)`.
   - Remove fake fallback URI on exception; raise typed `StorageUploadError`.
2. Register `InferenceProvider` in `apps/api/di.py`.
3. Run `uv run pytest tests/test_worker_callback_grpc.py` and full suite.

### Phase 4: Modularize Dataset Use Cases (`modules/dataset`)
1. Split `modules/dataset/use_cases/dataset_use_cases.py` into discrete files:
   - `create_dataset.py`
   - `list_project_datasets.py`
   - `get_dataset_detail.py`
   - `update_dataset.py`
   - `delete_dataset.py`
   - `create_dataset_version.py`
   - `list_dataset_versions.py`
   - `get_dataset_version_detail.py`
   - `publish_dataset_version.py`
   - `upload_version_assets.py`
   - `finalize_asset_import.py`
   - `inherit_dataset_version.py`
   - `download_asset.py`
2. Re-export all use cases in `modules/dataset/use_cases/__init__.py`.
3. Run `uv run pytest tests/` to confirm complete backwards compatibility.

### Phase 5: Verification & Acceptance Gates
1. Run static architecture checks (Domain purity, no forbidden imports).
2. Run full pytest suite (`uv run pytest tests/ -q`).
3. Run ruff linter and formatting checks.
