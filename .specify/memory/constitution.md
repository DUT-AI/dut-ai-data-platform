# DUT AI Data Platform Constitution

## Core Principles

### I. Pure Domain Purity & Protocol Agnosticism (NON-NEGOTIABLE)
- Domain entities, value objects, invariants, and business policies must be pure Python (`@dataclass` or plain classes).
- Zero dependencies on delivery protocols or external frameworks: no imports from FastAPI, Starlette, HTTP status codes, Pydantic, SQLAlchemy, or transport mechanics in the domain layer.
- Domain errors must inherit from `DomainException` (or `InvariantViolationError`, `BusinessRuleViolationError`) and remain strictly protocol-agnostic. Translation to HTTP 400, 404, 409 or gRPC codes belongs strictly to presentation-layer exception handlers.

### II. Unified Integer User Identifiers & Zero Fallbacks
- All user identifiers (`user_id`, `created_by`, `owner_id`) across all modules, entities, database tables, and API interfaces are strictly non-null positive integers (`int` / `Integer`).
- Never introduce type unions (`int | str`), defensive `isdigit()` coercions, or runtime fallbacks for user identities.
- If an identity context is missing or invalid, fail fast with explicit validation or authentication errors instead of silent fallbacks.

### III. Explicit Session & Transaction Boundaries
- Use cases and services must respect the caller's transaction scope: never unilaterally call `session.rollback()` or swallow domain exceptions within nested operations.
- Long-running transactions or external API operations must not lock database sessions.
- In-memory event publishing and outbox event persistence must be bound to the transactional unit of work.

### IV. Dependency Inversion & Singleton Connection Pooling
- External services, HTTP clients (e.g., Manage Service, Auth Client, S3 storage), and messaging publishers must be injected via Dishka dependency injection.
- Reusable network clients (`httpx.AsyncClient`, connection pools, botocore clients) must be managed as singletons or pool-managed resources with loop-aware lifecycle handling—never instantiate ephemeral clients per request.

### V. Modular Architecture & Router Subdomain Separation
- The backend follows a multi-module architecture (`core/`, `modules/<subdomain>`, `apps/api/routers/<subdomain>`).
- API router files must be modularized into discrete subdomain files (e.g., `projects.py`, `members.py`, `configurations.py`) united under a top-level module `__init__.py`. Never concentrate multiple aggregate roots or distinct sub-resources into a single monolithic router file.

## Quality & Architecture Constraints

### Technology Stack & Design System
- **Language & Runtime**: Python 3.12+, managed via `uv`.
- **Backend Framework**: FastAPI with Dishka dependency injection and Pydantic v2 schemas (`from_attributes=True`).
- **Database & Storage**: PostgreSQL via SQLAlchemy (asyncpg), MinIO/S3 compatible object storage, unified Alembic migrations.
- **Code Style & Formatting**: Strict adherence to Ruff rules (`ruff check`, `ruff format`). Never perform repository-wide write formatting in dirty worktrees.

### Testing & Verification Gates
- **Comprehensive Coverage**: Every feature, use case, domain invariant, and RBAC policy must have accompanying unit and integration tests.
- **Strict Regressions Gate**: All pull requests and code modifications must pass the complete test suite (`uv run pytest tests/ -q`) with zero failures before being considered complete.
- **Verification Evidence**: Completion claims must be backed by automated test and gate execution logs.

## Development Workflow & Governance

1. **Constitutional Primacy**: This constitution sets the architectural boundaries and quality baseline for all development in DUT AI Data Platform.
2. **Amendment Protocol**: Any change to these principles requires formal documentation, rationale review, and a designated semantic version bump.
3. **Spec-Kit Workflow**: All new features or non-trivial refactorings must follow the structured spec workflow (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`).

**Version**: 1.0.0 | **Ratified**: 2026-11-04 | **Last Amended**: 2026-11-05
