# Implementation Plan: Remediation of Backend Code Smells & Clean Architecture Flaws

**Branch**: `002-fix-clean-code-smells` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Remediation plan addressing 5 specific architectural flaws identified in the Senior Code Review.

## Summary

This plan provides the technical roadmap to eliminate 5 severe code smells and architectural impurities across the codebase:
1. Purge HTTP status codes and transport artifacts from the Domain Layer (`core/exceptions/base.py`, `modules/dataset/domain/policies.py`).
2. Standardize `user_id: int` across domain entities, clean up fragmented `@dataclass` field declarations, and replace `"system"` fallback strings with `SYSTEM_USER_ID = 0`.
3. Eliminate silent session rollbacks in `OntologyTemplateSeederService` and enforce proper transaction savepoints/exception propagation.
4. Replace ephemeral per-call `httpx.AsyncClient` instances in `AuthClient` and `ManageClient` with an application-scoped (`Scope.APP`) connection-pooled HTTP client injected via Dishka DI.
5. Eradicate 144 lines of dead code in `modules/ontology/use_cases/ontologies.py`.

All changes maintain 100% backwards compatibility and green status across all 111 existing tests.

## Technical Context

**Language/Version**: Python 3.12+

**Primary Dependencies**: FastAPI, Dishka DI, SQLAlchemy 2.0 (asyncpg), httpx 0.28+, Pydantic v2, Loguru

**Storage**: PostgreSQL 16+ (asyncpg)

**Testing**: pytest, pytest-asyncio

**Target Platform**: Linux / macOS containerized (Docker Compose)

**Project Type**: Modular Monolith Web API & Background Workers

**Performance Goals**:
- Eliminate 20-60ms TLS/TCP handshake latency per external authentication request via persistent HTTP keep-alive pooling.
- Ensure sub-millisecond in-memory domain invariant validations.

**Constraints**:
- Zero HTTP status codes (`status_code`, `BadRequestException`) inside `core/exceptions/base.py` and `modules/*/domain/`.
- Strict typing: `user_id` is always `int` within domain models; database models safely convert to/from `String(255)`.
- All 111 tests in `tests/` must pass after every phase.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Domain Purity**: Domain exceptions and policies must be completely protocol-agnostic.
- [x] **Strict Dataclass Standards**: Field definitions contiguous at top of class; methods and hooks declared strictly after all fields.
- [x] **Atomic Transactions**: Sub-services must never unilaterally call `session.rollback()`.
- [x] **Resource Pooling**: External network clients must be pooled and managed at application lifecycle scope (`Scope.APP`).
- [x] **Cleanliness**: Dead and unreferenced code must be eradicated.

## Project Structure

### Documentation (this feature)

```text
specs/002-fix-clean-code-smells/
├── spec.md                     # Feature specification
├── plan.md                     # This implementation plan
├── research.md                 # Architectural research & technical decisions
├── data-model.md               # Pure domain exception hierarchy & clean dataclasses
├── quickstart.md               # 5 automated verification gates
├── contracts/
│   ├── exception-mapping.md    # Presentation layer HTTP status mapping
│   └── http-client-provider.md # Dishka connection pooling provider contract
└── checklists/
    └── requirements.md         # Specification quality checklist
```

### Source Code Files to be Modified

```text
core/
├── constants.py                # NEW: Defines SYSTEM_USER_ID = 0
├── exceptions/
│   ├── base.py                 # Pure DomainException (0 status_code) & semantic subclasses
│   └── handlers.py             # Presentation mapping: DomainException -> HTTP status code
apps/api/
└── routers/annotation.py       # Replace fallback "system" with SYSTEM_USER_ID
modules/
├── dataset/domain/policies.py  # Replace BadRequestException with BusinessRuleViolationError
├── project/
│   ├── domain/entities.py      # Fix dataclass order, place __post_init__ at bottom
│   └── models/project.py       # Clean mapper casting to int
├── annotation/
│   └── models/annotation.py    # Clean mapper casting to int
├── ontology/
│   ├── services/seeder.py      # Remove session.rollback(), wrap in begin_nested() savepoint
│   └── use_cases/ontologies.py # Delete 144 lines of dead code (seed_ontology_from_template)
└── identity/
    ├── di.py                   # Register pooled httpx.AsyncClient at Scope.APP
    └── client/
        ├── auth_client.py      # Receive pooled client, remove per-call AsyncClient
        └── manage_client.py    # Receive pooled client, remove per-call AsyncClient
```

## Implementation Phases & Work Breakdown

### Phase 1: Pure Domain Exceptions & Policy Decoupling
1. **`core/exceptions/base.py`**:
   - Redefine `DomainException(message: str, details: dict | None = None)`.
   - Introduce `InvariantViolationError`, `BusinessRuleViolationError`, `EntityNotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`.
   - Retain backwards-compatible aliases (`NotFoundException = EntityNotFoundError`, etc.).
2. **`core/exceptions/handlers.py`**:
   - Add `EXCEPTION_HTTP_STATUS_MAP` dictionary to map domain error classes to HTTP status codes.
   - Update `domain_exception_handler` to read status code from mapping table.
3. **`modules/dataset/domain/policies.py`**:
   - Replace `from core.exceptions import BadRequestException` with `from core.exceptions.base import BusinessRuleViolationError`.
   - Update policy methods to raise `BusinessRuleViolationError`.
4. Run `uv run pytest tests/` to verify zero regression.

### Phase 2: User Identifier Standardization & Dataclass Formatting
1. **`core/constants.py`**:
   - Create file with `SYSTEM_USER_ID: int = 0`.
2. **`modules/project/domain/entities.py`**:
   - Move `__post_init__` to the bottom of `ProjectEntity` and `ProjectMemberEntity` after all field declarations.
   - Ensure `created_by: int` and `user_id: int` default to `SYSTEM_USER_ID` if string fallback occurs.
3. **`apps/api/routers/annotation.py`**:
   - Replace `"system"` fallback with `SYSTEM_USER_ID`.
4. **`modules/project/models/project.py` & `modules/annotation/models/annotation.py`**:
   - Replace inline ternary `isdigit() else ...` with clean `int(self.created_by) if str(self.created_by).isdigit() else SYSTEM_USER_ID`.
5. Run `uv run pytest tests/`.

### Phase 3: Seeder Session Safety & Savepoints
1. **`modules/ontology/services/seeder.py`**:
   - Remove `if self.session is not None: await self.session.rollback()`.
   - Wrap seeding block inside `async with self.session.begin_nested():` to create a transactional savepoint.
   - If an error occurs, the savepoint rolls back locally without killing the parent session; log warning and propagate or exit gracefully.
2. Run ontology tests: `uv run pytest tests/test_ontology*.py`.

### Phase 4: Shared HTTP Client Connection Pooling
1. **`modules/identity/di.py`**:
   - Define `@provide(scope=Scope.APP)` providing `httpx.AsyncClient` with connection pooling limits (`max_keepalive_connections=20`, `max_connections=100`).
   - Update `get_auth_client` and `get_manage_client` to inject the pooled client.
2. **`modules/identity/client/auth_client.py` & `manage_client.py`**:
   - Update `__init__(self, client: httpx.AsyncClient)` to store `self._client = client`.
   - Remove `async with httpx.AsyncClient(...)` from `get_me()`, `login()`, `list_users()`. Use `await self._client.get(...)`.
   - Remove `from fastapi import HTTPException`; raise domain/infrastructure exceptions.
3. Run identity & auth tests: `uv run pytest tests/test_auth*.py`.

### Phase 5: Dead Code Elimination
1. **`modules/ontology/use_cases/ontologies.py`**:
   - Delete `seed_ontology_from_template` (lines 47-191).
   - Clean up unused imports (`IProjectRepository`, `IProjectCatalogRepository`, etc.).
2. Run `uv run pytest tests/`.

### Phase 6: Automated Gate Verification
1. Run all 5 gates defined in `quickstart.md`.
2. Run full pytest suite: `uv run pytest tests/ -q`.
3. Run ruff linter: `uv run ruff check .`.
