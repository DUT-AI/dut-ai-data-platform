# Feature Specification: Backend Clean Architecture & SOLID Refactoring

**Feature Branch**: `001-backend-clean-architecture-solid`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Bạn hãy xem thử phần BE, là 1 senior code thì bạn sẽ phải chỉnh sữa như sao để đúng về nghiệp vụ và code sạch/ clean code/ SOLID"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pure Domain Models & Business Invariant Enforcement (Priority: P1)

As a Senior Backend Engineer and Domain Maintainer, I want all enterprise domain entities across all modules (`identity`, `project`, `dataset`, `ontology`, `annotation`, `inference`) to be pure Python objects free from framework and persistence dependencies (Pydantic, SQLAlchemy, FastAPI, external clients), so that business validation rules and invariants are encapsulated directly within rich aggregate roots rather than scattered procedural logic.

**Why this priority**:
P1 is essential because the domain layer is the core of Clean Architecture. If domain models are contaminated with presentation/DTO schemas (e.g. Pydantic models in `identity/domain`) or remain anemic (e.g. `AnnotationEntity` and `DatasetEntity` requiring SQL repositories to compute business states like `revision_number`), any higher-level refactoring will continuously leak infrastructure concerns.

**Independent Test**:
Can be fully tested in isolation via unit tests with zero I/O, zero database setup, and zero framework mocks: instantiate `AnnotationEntity`, execute business methods (`add_revision`, `archive`), and verify that domain invariants (revision sequence, status transitions, validation of target and schema) are enforced strictly.

**Acceptance Scenarios**:

1. **Given** an existing `AnnotationEntity` with revisions 1 and 2, **When** domain action `add_revision(source="human", results=[...], created_by="user_1")` is invoked, **Then** a new `AnnotationRevisionEntity` is appended with `revision_number=3`, timestamp is updated, and the entity state remains valid without any SQL repository querying for max revision number.
2. **Given** `modules/identity/domain/entities.py`, **When** inspected by static analysis, **Then** it contains zero imports from `pydantic`, `fastapi`, `sqlalchemy`, or database drivers, and all transport DTOs (`TokenResponse`, `AuthUser`) are located in application/presentation layers.
3. **Given** a `DatasetEntity` in "published" state, **When** attempting to mutate assets directly or mutate published version configuration, **Then** the aggregate root raises a domain exception (`DatasetVersionImmutableError`).

---

### User Story 2 - Decoupled Cross-Module Interactions via Events & Facades (Priority: P2)

As a Platform Architect, I want bounded contexts (`ontology`, `project`, `dataset`, `annotation`, `inference`) to communicate via Domain Events (Transactional Outbox) and dedicated Application Services rather than cross-injecting foreign repositories and passing 9-11 direct constructor dependencies, so that individual modules can evolve and be tested independently without tight coupling.

**Why this priority**:
Currently, `CreateOntologyUseCase` injects 9 repositories (including foreign `IProjectRepository` and `IProjectCatalogRepository`), and `seed_ontology_from_template` reaches across module boundaries to orchestrate 11 different entities. This violates Single Responsibility and High Cohesion, creating fragile cascade failures when either schema changes.

**Independent Test**:
Testable by creating a new `ProjectEntity` in a test environment with an in-memory Outbox repository; verify that a `ProjectCreated` event is recorded in the Outbox without `CreateProjectUseCase` needing direct access to the `Ontology` database tables or `IOntologyRepository`.

**Acceptance Scenarios**:

1. **Given** a new project is created via `CreateProjectUseCase`, **When** the transaction commits, **Then** an Outbox event `ProjectCreatedEvent` is recorded with template metadata, allowing the ontology initialization handler to consume it asynchronously or via an isolated orchestrator service.
2. **Given** `CreateOntologyUseCase`, **When** instantiated in DI, **Then** it requires at most 3 focused dependencies (its aggregate repository, unit of work, and template resolution facade/service) instead of 9 separate repositories.
3. **Given** a failure during project template ontology seeding, **When** the error occurs, **Then** the transaction rolls back cleanly without leaving orphaned records across 6 distinct ontology tables.

---

### User Story 3 - Strict Dependency Inversion & Resilient Infrastructure Adapters (Priority: P3)

As a DevOps and Backend Engineer, I want all external infrastructure clients (S3/MinIO storage, gRPC clients, external identity APIs, RabbitMQ) to implement abstract protocol interfaces (`IStorageProvider`, `IAuthClient`, `IRuntimeClient`), register cleanly in Dishka DI, avoid blocking synchronous operations in async code, and never swallow errors silently with mock fallbacks, so that the system operates reliably under failure conditions.

**Why this priority**:
Currently, `S3PredictionStorage` instantiates a concrete `MinIOStorageAdapter` by default, breaks the Law of Demeter by accessing internal `client` properties, performs blocking synchronous `put_object` calls, and swallows exceptions returning a fake S3 URI. Fixing infrastructure adherence prevents silent data loss and latency degradation in worker pipelines.

**Independent Test**:
Execute an inference job where the S3 bucket is temporarily unreachable; verify that the storage adapter raises a well-defined `StorageUploadError`, triggers retry or dead-letter queuing in AMQP, and never returns a fake success URI.

**Acceptance Scenarios**:

1. **Given** `S3PredictionStorage`, **When** uploading a prediction artifact, **Then** it delegates to an asynchronous `IStorageProvider.upload` method through an injected interface rather than calling `self._adapter.client.put_object` synchronously.
2. **Given** a storage adapter upload failure, **When** an exception occurs, **Then** the error is propagated as a domain/infrastructure exception (`StorageError`) rather than silently returning a falsified URI `s3://...`.
3. **Given** `apps/api/di.py` and `apps/ai_worker/main.py`, **When** starting the worker or API server, **Then** all service dependencies (including `InferenceProvider` and `S3PredictionStorage`) are resolved through the Dishka DI container without ad-hoc instantiation in loops.

---

### Edge Cases

- **Concurrent Revision Creation**: Two concurrent users add revisions to the same annotation simultaneously. The aggregate versioning must handle optimistic locking or unique constraint conflicts (`annotation_id`, `revision_number`) gracefully with automatic retry or 409 Conflict.
- **Large Asset Streaming**: In `UploadVersionAssetsUseCase`, uploading large multi-gigabyte video or image datasets must not buffer complete file byte arrays into RAM (`io.BytesIO(content)` in a single loop). The system must utilize streaming chunks or direct presigned S3 URLs.
- **Identity ID Type Standardization**: User identifier is strictly typed as `int` (matching external Manage/Auth Server integer IDs). Entity references to users (`created_by`, `user_id`, `owner_id`, `ProjectMemberEntity.user_id`) must consistently use `int`, while domain resource entities (projects, datasets, assets, annotations, ontologies) use ULID `str`. This eliminates defensive runtime `isinstance`, `getattr`, and type guessing.
- **Transaction Rollback with Outbox**: If a database transaction fails during aggregate save, outbox events generated in that session must be rolled back atomically so events are never dispatched for failed state mutations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Pure Domain Entities: All domain entities in `modules/*/domain/entities.py` MUST be implemented using standard Python (`dataclass` or plain classes) with zero dependencies on Pydantic, SQLAlchemy, or FastAPI.
- **FR-002**: Rich Aggregates & Invariant Protection: `AnnotationEntity` MUST act as an Aggregate Root managing its internal `revisions` collection, automatically deriving sequential `revision_number` and validating state transitions.
- **FR-003**: Repository Pure Abstraction: Database repository implementations (`modules/*/repository/`) MUST NOT contain domain calculation logic (such as calculating the next revision number or business validation). Repositories MUST only query, map to/from domain entities, and persist records.
- **FR-004**: Decoupled Module Interfaces: Modules MUST NOT directly import or query repositories of another module. Cross-module data retrieval MUST occur through domain events or explicit Facade/Application services defined via abstract Protocols.
- **FR-005**: Refactored Ontology Seeding: The template seeding logic in `modules/ontology/` MUST be extracted into a dedicated Domain/Application Service (`OntologyTemplateSeederService`), reducing constructor dependencies of `CreateOntologyUseCase` from 9 to standard cohesion limits (<= 3-4 dependencies).
- **FR-006**: Dependency Inversion (DIP) Compliance: All use case constructors MUST depend strictly on abstract Protocol interfaces (e.g. `IAuthClient`, `IStorageProvider`, `IProjectRepository`), never on concrete client implementations or singleton configuration instances.
- **FR-007**: Safe Infrastructure Error Handling: Storage adapters (`S3PredictionStorage`, `MinIOStorageAdapter`) MUST NOT swallow errors or return fake success fallback URIs upon network or I/O failure. Exceptions MUST be categorized and propagated.
- **FR-008**: Async I/O Consistency: All I/O operations (S3 uploads/downloads, database queries, gRPC calls, AMQP message processing) MUST be non-blocking async operations (`aioboto3` or run in thread executor pools for blocking libraries).
- **FR-009**: Single Responsibility File Structure: Large multi-use-case files (such as `modules/dataset/use_cases/dataset_use_cases.py` with 660 lines) MUST be partitioned into discrete, single-responsibility files (one use case per file, e.g. `publish_dataset_version.py`, `upload_version_assets.py`).
- **FR-010**: Standardized Module Layout: All modules under `modules/` MUST adopt a uniform Clean Architecture directory layout: `domain/` (entities, interfaces, exceptions), `application/` (use cases, dtos), and `infrastructure/` (persistence models, repositories, clients, di).
- **FR-011**: Standardized User ID Type: The user identifier across the platform MUST be consistently typed as `int` (`user_id: int`, `created_by: int`, `owner_id: int`), reflecting the external Auth/Manage Server integer primary key, eliminating hybrid `int`/`str` casting and defensive `getattr` fallback code.
- **FR-012**: Unit of Work & Transaction Boundaries: Multi-entity writes (e.g., project + owner member + configuration) MUST execute inside an explicit Unit of Work / database transaction boundary to guarantee atomic persistence.

### Key Entities *(include if feature involves data)*

- **Annotation Aggregate**: Root entity encapsulating `id`, `asset_id`, `project_id`, `target`, `ontology_version_id`, and `revisions` (`list[AnnotationRevisionEntity]`). Governs revision creation, sequence integrity, and status updates.
- **Dataset Aggregate**: Root entity encapsulating `id`, `project_id`, `name`, `status`, and `versions` (`list[DatasetVersionEntity]`). Enforces version immutability upon publication.
- **Project Aggregate**: Root entity encapsulating project lifecycle, member authorizations (`ProjectMemberEntity`), and storage/workflow configurations (`ProjectConfigurationEntity`).
- **Outbox Event Entity**: Shared persistence model recording domain events (`EventId`, `AggregateType`, `AggregateId`, `EventType`, `Payload`, `Status`, `CreatedAt`) to ensure atomic event delivery via Transactional Outbox pattern.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of domain files (`modules/*/domain/`) have zero external third-party dependencies (verified by lint/dependency rules: no `pydantic`, `fastapi`, `sqlalchemy` in domain).
- **SC-002**: 0 instances of silent error suppression or fake success fallbacks in infrastructure storage and client adapters.
- **SC-003**: Average constructor dependency count per Use Case is reduced from up to 9 dependencies to an average of <= 3 dependencies across all modules.
- **SC-004**: Existing test suite (111 tests in `tests/`) passes completely without regression after architecture cleanup and refactoring.
- **SC-005**: 100% of multi-use-case files exceeding 300 lines are modularized into single-responsibility use case files.

## Assumptions

- Python 3.12+ and Dishka DI remain the core dependency injection framework.
- FastAPI remains the HTTP presentation layer and Dishka FastAPI integration (`FromDishka`, `inject`) remains the standard adapter.
- Existing database tables and schema migrations in PostgreSQL are preserved; domain entity refactoring does not require breaking database schema migrations unless column alignment is strictly required.
- External Manage Server contract (OAuth/JWT) is maintained; changes to `modules/identity` will preserve API endpoint compatibility for the frontend.
