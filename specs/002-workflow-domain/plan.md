# Implementation Plan: Workflow Domain Management

**Branch**: `002-workflow-domain` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-workflow-domain/spec.md` with resolved clarifications on standard state machine, optional review comments, single user assignment with metadata, active-only cancellation, and batch asset distribution.

## Summary

Implement the `Workflow Domain` as a new modular monolith package (`modules/workflow`) conforming to Clean Architecture and DDD principles, integrated with a rich Next.js frontend UI (`web/src/features/workflow`). The domain provides decoupled business process lifecycle orchestration for the platform. It introduces generic `WorkItem` entities (supporting individual items or batched asset groups created directly from real project datasets and versions), an immutable `TransitionEngine` enforcing standard lifecycle states (`Created` -> `Assigned` -> `InProgress` -> `Submitted` -> `InReview` -> `Approved`/`Rejected` -> `Completed`), single primary user assignment with bulk auto-distribution capabilities, and an immutable audit trail (`workflow_history`).

## Technical Context

**Language/Version**: Python 3.12+ (Backend), TypeScript / React 19 / Next.js 15 (Frontend)

**Primary Dependencies**: FastAPI, Dishka DI, SQLAlchemy 2.0 (asyncpg), Pydantic v2, TanStack Query v5, Lucide React, Tailwind CSS

**Storage**: PostgreSQL 16+ (asyncpg) with Alembic migration, MinIO (asset storage via dataset domain)

**Testing**: pytest, pytest-asyncio, aiosqlite, tsc typecheck

**Target Platform**: Linux / macOS containerized (Docker Compose)

**Project Type**: Modular Monolith Backend Service (`modules/workflow`) integrated into `apps/api`

**Performance Goals**: State transitions and validation p95 response time < 150ms; zero blocking synchronous I/O.

**Constraints**:
- Domain Layer (`modules/workflow/domain/`) must be pure Python with zero imports from `pydantic`, `fastapi`, or `sqlalchemy`.
- User identifiers (`assigned_by`, `assignee_id`, `changed_by`) are strictly typed as `int`.
- Platform resource identifiers (`workflow_id`, `work_item_id`, `assignment_id`) are ULID/UUID `str`.
- Zero illegal state transitions allowed (enforced by `TransitionEngine`).
- Cancellation allowed only on non-terminal active states (forbidden on `Approved` and `Completed`).

**Scale/Scope**: 1 new module (`modules/workflow`), 4 database tables, 5 use cases, 1 API router.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Domain Purity**: Domain entities and `TransitionEngine` are pure Python dataclasses/classes without external framework or ORM imports.
- [x] **Dependency Inversion**: Use cases depend exclusively on `typing.Protocol` repository interfaces.
- [x] **Single Responsibility**: Each use case is encapsulated in its own file under `application/use_cases/`.
- [x] **Strict ID Typing**: All user references are strictly typed as `int`.
- [x] **Audit Integrity**: Every state change produces an immutable audit record in `workflow_history`.

## Project Structure

### Documentation (this feature)

```text
specs/002-workflow-domain/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── domain-interfaces.md
│   └── ui-contracts.md
└── checklists/
    └── requirements.md
```

### Source Code Architecture

```text
modules/workflow/
├── __init__.py
├── domain/
│   ├── __init__.py
│   ├── entities/
│   │   ├── __init__.py
│   │   └── workflow.py       # WorkflowDefinition, WorkItem, Assignment, WorkflowHistory
│   ├── interfaces/
│   │   ├── __init__.py
│   │   └── repositories.py   # Protocols for Definition, WorkItem, Assignment, History
│   ├── services/
│   │   ├── __init__.py
│   │   └── transition_engine.py # Pure state machine validation engine
│   └── exceptions/
│       ├── __init__.py
│       └── workflow_exceptions.py # InvalidStateTransitionError, WorkItemNotFoundError, etc.
├── application/
│   ├── __init__.py
│   ├── dtos/
│   │   ├── __init__.py
│   │   └── workflow_dtos.py  # Pydantic input/output schemas
│   └── use_cases/
│       ├── __init__.py
│       ├── create_workflow_definition.py
│       ├── create_batch_work_items.py
│       ├── transition_work_item.py
│       ├── bulk_assign_work_items.py
│       └── get_work_item_history.py
├── infrastructure/
│   ├── __init__.py
│   ├── persistence/
│   │   ├── __init__.py
│   │   └── models.py         # SQLAlchemy 2.0 mapped models
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── workflow_definition_repository.py
│   │   ├── work_item_repository.py
│   │   ├── assignment_repository.py
│   │   └── history_repository.py
│   └── di/
│       ├── __init__.py
│       └── provider.py       # Dishka provider registration
└── presentation/
    ├── __init__.py
    └── api/
        ├── __init__.py
        └── routes.py         # FastAPI router for /api/v1/workflows & /api/v1/work-items
```

## Phase 0: Research & Technical Validation

All technical decisions resolved in [research.md](./research.md):
- Standard state machine transition rules verified.
- Batching model (`ANNOTATION_BATCH`) and bulk distribution strategy defined.
- Strict `user_id` as `int` validated against project standards.
- Real dataset and asset integration pattern resolved with end-to-end data provenance.

## Phase 1: Architecture & Contract Design

Completed design artifacts:
- **Data Model**: Relational schema & entity dataclasses in [data-model.md](./data-model.md).
- **Domain Contracts**: Pure Python protocol interfaces in [contracts/domain-interfaces.md](./contracts/domain-interfaces.md).
- **UI Contracts**: Component & data fetching contracts in [contracts/ui-contracts.md](./contracts/ui-contracts.md).
- **Quickstart Guide**: Developer verification and curl examples in [quickstart.md](./quickstart.md).
