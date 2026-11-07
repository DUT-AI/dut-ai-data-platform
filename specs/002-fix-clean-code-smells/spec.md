# Feature Specification: Remediation of Backend Code Smells & Clean Architecture Violations

**Feature Branch**: `002-fix-clean-code-smells`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User review feedback addressing 5 architectural flaws:
1. Domain Layer Impurity: HTTP status codes and transport concepts leaking into domain exceptions and policies.
2. User Identifier Inconsistencies: `int` vs `str` database model vs entity type conflicts, dirty defensive casts, and misaligned `__post_init__` declarations in `@dataclass`.
3. Seeder Exception Swallowing & Shared Session Rollback: `OntologyTemplateSeederService` rolling back the request-scoped database session and swallowing exceptions, causing silent data loss.
4. HTTP Client Connection Leaks: `httpx.AsyncClient` recreated per HTTP request in `AuthClient` and `ManageClient` without connection pooling.
5. Dead Code: Orphaned legacy `seed_ontology_from_template` function remaining in `modules/ontology/use_cases/ontologies.py`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pure Domain Exceptions without Transport/HTTP Leaks (Priority: P1)

As a Platform Domain Architect, I want all domain exceptions and policy rules in `core/exceptions/base.py` and `modules/dataset/domain/policies.py` to be strictly protocol-agnostic (pure Python exceptions without HTTP status codes like `status_code=400` or `BadRequestException`), so that core business rules remain reusable across CLI, gRPC, background workers, and REST APIs without framework coupling.

**Why this priority**:
P1 is fundamental to Clean Architecture. If domain exceptions carry HTTP semantics, the domain layer is tightly coupled to web presentation protocols, preventing reuse in non-HTTP contexts (e.g. AMQP workers, gRPC servicers, background jobs).

**Independent Test**:
Import and raise domain exceptions in an isolated unit test with zero web dependencies; verify that `DomainException`, `EntityNotFoundError`, `InvariantViolationError`, and `BusinessRuleViolationError` contain only domain messages and business context, while presentation handlers (`core/exceptions/handlers.py`) map these exceptions to HTTP 400/404/409 codes.

**Acceptance Scenarios**:

1. **Given** a dataset version policy violation in `DatasetVersionPolicy.ensure_can_modify_draft`, **When** the version is not in draft status, **Then** a pure `BusinessRuleViolationError` or `InvariantViolationError` is raised without any reference to HTTP `BadRequestException` or `status_code`.
2. **Given** `core/exceptions/base.py`, **When** inspected, **Then** `DomainException` constructor accepts only `message: str` and optional domain metadata (zero `status_code` parameters).
3. **Given** a REST API request that triggers a `DomainException`, **When** the exception reaches the FastAPI presentation layer, **Then** the global exception handler maps it to the appropriate HTTP status code (`400`, `404`, `409`) and formats the JSON response.

---

### User Story 2 - Consistent User Identifier Typing & Clean Dataclasses (Priority: P1)

As a Backend Engineer, I want the `created_by` and `user_id` fields to be cleanly and strictly typed as `int` across all domain entities, database mappers, and API request handlers, without defensive string checking (`isdigit()`), misplaced `__post_init__` declarations, or `"system"` string fallbacks, so that static typing and database integrity are preserved.

**Why this priority**:
P1 because type mismatches between SQLAlchemy `String(255)` columns and Python `int` entities cause runtime `TypeError` issues, silent type coercions, and unreadable defensive code spread across mappers and dataclasses.

**Independent Test**:
Instantiate `ProjectEntity`, `ProjectMemberEntity`, `AnnotationEntity`, and `AnnotationRevisionEntity` with integer user IDs and persist them through repositories. Verify that dataclass definitions have no misplaced methods interrupting field declarations and that mapper conversion (`to_entity`, `from_entity`) is clean and deterministic.

**Acceptance Scenarios**:

1. **Given** `ProjectEntity` and `ProjectMemberEntity` in `modules/project/domain/entities.py`, **When** inspected, **Then** all `@dataclass` field declarations appear contiguously at the top of the class, and `__post_init__` (if needed) is placed at the bottom after all fields.
2. **Given** an annotation created by a background process or system actor, **When** persisted, **Then** a reserved integer sentinel constant (`SYSTEM_USER_ID = 0` or authenticated user ID) is used instead of the arbitrary string `"system"`.
3. **Given** database models `ProjectModel`, `ProjectMemberModel`, `AnnotationModel`, and `AnnotationRevisionModel`, **When** `to_entity()` is called, **Then** integer conversion is executed cleanly without ad-hoc inline ternary expressions returning ambiguous `str | int` unions.

---

### User Story 3 - Safe Transaction Boundaries & Seeder Exception Propagation (Priority: P1)

As a System Integrator, I want `OntologyTemplateSeederService` to never swallow exceptions or unilaterally roll back the shared request-scoped `AsyncSession`, so that failed ontology seedings fail fast, maintain transactional integrity, and prevent false-positive 201 Created responses for non-existent entities.

**Why this priority**:
P1 critical defect. When `seeder.py` caught `Exception`, called `session.rollback()`, and logged a warning, the newly created ontology and version records were erased from the database while the use case returned 201 Created. Clients immediately received 404 Not Found upon querying the created resource.

**Independent Test**:
Execute `CreateOntologyUseCase` with an invalid template key or simulated seeder failure; verify that the operation raises an exception, the session rollback is orchestrated by the transaction boundary (not swallowed), and no partial/ghost resources return HTTP 201.

**Acceptance Scenarios**:

1. **Given** `OntologyTemplateSeederService`, **When** an error occurs during category or tool mapping, **Then** the seeder does NOT call `self.session.rollback()` directly; it propagates a typed domain error (`OntologySeedingError`).
2. **Given** a seeding failure in `CreateOntologyUseCase`, **When** the error propagates, **Then** the entire transaction rolls back atomically at the UoW/request boundary and the client receives an appropriate error response rather than a deceptive 201 Created.
3. **Given** `OntologyTemplateSeederService`, **When** provided with a database session, **Then** it delegates transaction commit/rollback lifecycle to the owning use case or transaction manager.

---

### User Story 4 - Persistent HTTP Client Connection Pooling (Priority: P2)

As a DevOps and Performance Engineer, I want `AuthClient` and `ManageClient` to utilize a shared, long-lived `httpx.AsyncClient` with connection pooling registered in Dishka DI (`Scope.APP`), so that high-volume authentication requests do not suffer connection setup overhead, TLS renegotiation latency, or socket exhaustion.

**Why this priority**:
P2 performance and stability. Recreating `httpx.AsyncClient` on every request introduces 20-60ms of latency per call and risks socket port exhaustion under concurrent load.

**Independent Test**:
Execute concurrent `get_me()` or `list_users()` calls using an instrumented client; verify that underlying HTTP connections are reused from the pool (TCP keep-alive) and that no dangling unclosed client sessions remain.

**Acceptance Scenarios**:

1. **Given** `AuthClient` and `ManageClient`, **When** injected via Dishka DI, **Then** they receive a shared `httpx.AsyncClient` instance managed at `Scope.APP`.
2. **Given** application startup and shutdown in `apps/api/main.py`, **When** the application lifecycle transitions, **Then** the pooled HTTP client is opened at startup and gracefully closed during shutdown.
3. **Given** `AuthClient` and `ManageClient`, **When** network or remote API errors occur, **Then** they raise structured infrastructure exceptions (`ExternalServiceError`, `AuthenticationError`) instead of leaking FastAPI's `HTTPException` into the infrastructure layer.

---

### User Story 5 - Dead Code Elimination (Priority: P3)

As a Code Maintainer, I want all obsolete, duplicated, and superseded code (specifically the 144-line `seed_ontology_from_template` function in `modules/ontology/use_cases/ontologies.py`) completely removed from the codebase.

**Why this priority**:
P3 code hygiene. Dead code confuses developers, inflates codebase size, and creates maintenance hazards when developers mistakenly edit the wrong implementation.

**Independent Test**:
Search the repository for all references to `seed_ontology_from_template`; verify that only the modern `OntologyTemplateSeederService` remains and that the test suite passes with 0 errors.

**Acceptance Scenarios**:

1. **Given** `modules/ontology/use_cases/ontologies.py`, **When** scanned, **Then** the legacy `seed_ontology_from_template` function and unused repository imports are removed.
2. **Given** the test suite `uv run pytest tests/`, **When** executed, **Then** 100% of tests pass without dependency on the deleted dead code.

---

### Edge Cases

- **System Action User ID**: Background workers, seeding scripts, and automated inference callbacks do not have an authenticated human user. A standardized constant `SYSTEM_USER_ID: int = 0` must be used across all modules instead of `"system"` strings.
- **Legacy Database String Columns**: Existing PostgreSQL tables use `String(255)` for `created_by`, `owner_id`, and `user_id`. The domain layer enforces `int`, and repository models must cast safely to/from string representation during persistence without leaking union types `int | str` into Domain Entities.
- **Savepoints for Optional Seeding**: If template seeding is deemed non-critical in specific scenarios, a database savepoint (`session.begin_nested()`) must be used so that rolling back the seed attempt does not abort the parent transaction.
- **HTTP Client Timeout & Keep-Alive Configuration**: Connection pool must configure appropriate limits (`max_keepalive_connections=20`, `max_connections=100`, `timeout=10.0s`) to prevent connection accumulation while handling traffic spikes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Pure Domain Exceptions: `DomainException` in `core/exceptions/base.py` MUST NOT accept or store HTTP `status_code`. All subclasses (`EntityNotFoundError`, `InvariantViolationError`, `BusinessRuleViolationError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`) MUST be protocol-agnostic.
- **FR-002**: Presentation Exception Mapping: HTTP status codes MUST be mapped strictly within `core/exceptions/handlers.py` via FastAPI exception handlers, translating `EntityNotFoundError` to HTTP 404, `ConflictError` to HTTP 409, and `InvariantViolationError` / `BusinessRuleViolationError` to HTTP 400.
- **FR-003**: Domain Policies Purity: `modules/dataset/domain/policies.py` MUST NOT import or raise `BadRequestException`. It MUST raise `InvariantViolationError` or `BusinessRuleViolationError`.
- **FR-004**: Clean Dataclass Structure: In `modules/project/domain/entities.py`, all dataclass field definitions MUST be declared contiguously. The `__post_init__` hook MUST NOT be nested between field declarations.
- **FR-005**: Standardized System User Identifier: A centralized sentinel constant `SYSTEM_USER_ID = 0` MUST be defined in `core/constants.py` (or `modules/identity/domain/entities.py`) and used for all system/automated operations, replacing arbitrary `"system"` strings.
- **FR-006**: Seeder Transaction Safety: `OntologyTemplateSeederService` MUST NOT invoke `session.rollback()`. Seeding failures MUST either propagate as `OntologySeedingError` or be isolated within an explicit nested transaction (`begin_nested`).
- **FR-007**: Shared HTTP Connection Pool: `AuthClient` and `ManageClient` MUST receive a shared `httpx.AsyncClient` instance provided via Dishka DI at `Scope.APP` with connection pooling enabled.
- **FR-008**: Dead Code Removal: The legacy `seed_ontology_from_template` function in `modules/ontology/use_cases/ontologies.py` MUST be permanently deleted.

### Key Entities & Exceptions

- **DomainException**: Base pure Python exception (`message: str`, `details: dict | None`).
- **InvariantViolationError**: Raised when an entity's internal invariants are violated (e.g. invalid state transition, malformed identifier).
- **BusinessRuleViolationError**: Raised when a domain policy rule fails (e.g. attempting to publish a non-draft dataset version).
- **EntityNotFoundError**: Raised when a requested domain entity cannot be found by its identifier.
- **SYSTEM_USER_ID**: Constant `int = 0` designating automated, migration, or internal platform actions.
- **PooledHTTPClient**: Dishka-provided `httpx.AsyncClient` managed at application lifecycle scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero references to HTTP concepts (`status_code`, `BadRequestException`, `HTTPException`) inside `core/exceptions/base.py`, `modules/*/domain/`, and infrastructure clients.
- **SC-002**: 100% of entity `created_by` and `user_id` attributes are typed strictly as `int`, with 0 instances of `"system"` string or dirty `isdigit()` fallback code in domain entities.
- **SC-003**: 0 unhandled shared session rollbacks; seeder errors fail fast and cleanly roll back the entire transaction atomically.
- **SC-004**: Single persistent connection pool for all external identity HTTP communications; reduction of per-request client instantiation count to 0.
- **SC-005**: 144 lines of dead code eradicated from `modules/ontology/use_cases/ontologies.py`.
- **SC-006**: 100% of automated tests pass without errors (`uv run pytest tests/ -q`).

## Assumptions

- PostgreSQL schema migrations do not immediately change `String(255)` columns to `INTEGER` to preserve backwards compatibility with running deployments; safe string-to-int conversion is handled cleanly at the repository mapper layer.
- External Auth/Manage Server continues to return integer user IDs (`id: int`).
- Dishka DI container supports `Scope.APP` async generators for managing `httpx.AsyncClient` startup and teardown.
