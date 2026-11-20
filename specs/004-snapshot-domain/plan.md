# Implementation Plan: Snapshot Domain & Immutable Dataset Publishing

**Branch**: `004-snapshot-domain` | **Date**: 2026-11-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-snapshot-domain/spec.md` with 9 resolved clarifications on multilabel iterative stratification, soft-deletion archiving, project-unique SemVer naming, referential protection guardrails, SHA-256 canonical checksums, 60-minute worker timeouts with manual cancellation, keyset pagination, two-tier diff architecture, and mutable release aliases.

---

## Summary

Implement the `Snapshot Domain` as a new modular package (`modules/snapshot`) conforming strictly to Clean Architecture and Domain-Driven Design (DDD) principles. The domain provides frozen, immutable dataset releases ensuring 100% reproducible training, evaluation, and export pipelines. It introduces:
1. **Immutable Snapshot Aggregate Root**: Governed by strict state transitions (`CREATING` -> `READY` / `ARCHIVED` / `FAILED`), referencing specific Dataset Versions and published Ontology Versions.
2. **Quality & Ontology Gating**: Selecting annotation revisions by policy (`LATEST_APPROVED` / `LATEST_SUBMITTED`) and verifying strict schema compliance.
3. **Multilabel Iterative Stratification Engine**: A pure-Python splitting algorithm guaranteeing class distribution balance within 2% across train/val/test splits.
4. **Deterministic Integrity & Manifest Engine**: Canonical JSON SHA-256 item checksums and aggregate digests persisted both in PostgreSQL and S3/MinIO.
5. **Two-Tier Snapshot Diff Service**: High-performance KPI summary comparison and paginated item-level delta queries.
6. **Lifecycle & Release Tagging**: Mutable project-wide alias tags (`production`, `staging`), soft-deletion archiving, and Project Owner-only hard purge protection.

---

## Technical Context

**Language/Version**: Python 3.12+ (Backend, managed via `uv`)

**Primary Dependencies**: FastAPI, Dishka DI, SQLAlchemy 2.0 (asyncpg), Pydantic v2 (`from_attributes=True`), Python standard library (`hashlib`, `json`, `random`, `math`, `asyncio`), `ulid-py`

**Storage**: PostgreSQL 16+ (asyncpg) with Alembic migrations, MinIO/S3 object storage for canonical JSON manifests

**Testing**: `pytest`, `pytest-asyncio`, `aiosqlite` (in-memory SQLite for rapid unit tests), integration tests with PostgreSQL/MinIO

**Target Platform**: Containerized Linux / macOS (Docker Compose)

**Project Type**: Modular Monolith Backend Subdomain (`modules/snapshot`) integrated into `apps/api/routers/snapshot`

**Performance Goals**:
- Snapshot creation for 10,000 items completes in < 30 seconds asynchronously (SC-002).
- Class frequency distribution in stratified splits deviates by ≤ 2% from global dataset distribution (SC-004).
- Keyset pagination response time p95 < 50ms for 1,000 items (O(1) index seek).
- Snapshot Diff summary report for two 10,000-item snapshots calculates in < 3 seconds (SC-006).

**Constraints**:
- **Domain Layer (`modules/snapshot/domain/`)**: Pure Python with ZERO imports from FastAPI, Starlette, Pydantic, SQLAlchemy, or transport mechanics (Constitution Principle I).
- **User Identifiers**: `created_by` across entities, tables, and schemas is strictly typed as non-null positive `int` (Constitution Principle II).
- **Resource Identifiers**: Snapshot, Snapshot Item, Manifest, and Tag IDs are sortable 26-character ULID strings (`generate_ulid()`).
- **Transaction Scope**: Long-running snapshot background worker must not hold open database transactions during S3 I/O or heavy matrix stratification (Constitution Principle III).
- **Dependency Injection**: All repositories, storage gateways, and upstream service adapters must be injected via Dishka providers (Constitution Principle IV).
- **Execution Ceiling**: Maximum 60-minute timeout for background worker; manual cancellation supported via `POST /cancel`.

**Scale/Scope**: 1 new domain module (`modules/snapshot`), 4 database tables (`snapshots`, `snapshot_items`, `snapshot_manifests`, `snapshot_tags`), 8 use cases, 1 modular API router (`apps/api/routers/snapshot/`), full test suite.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Pure Domain Purity & Protocol Agnosticism**: All domain entities (`SnapshotEntity`, `SnapshotItemEntity`, `SnapshotManifestEntity`, `ReleaseTagEntity`), value objects (`SplitRatios`), and domain exceptions (`SnapshotImmutableError`, `OntologyIncompatibilityError`) are pure Python classes with zero dependencies on frameworks, ORMs, or HTTP status codes.
- [x] **II. Unified Integer User Identifiers & Zero Fallbacks**: `created_by` is strictly `int` throughout domain entities, SQLAlchemy models, DTOs, and API route dependencies. No type unions or defensive string coercions.
- [x] **III. Explicit Session & Transaction Boundaries**: Batch item insertions and manifest updates operate in discrete transactional units of work. Background worker runs asynchronously without locking database sessions during S3 uploads or matrix calculations.
- [x] **IV. Dependency Inversion & Singleton Connection Pooling**: All persistence and external gateway interfaces are abstract `typing.Protocol` classes registered in Dishka DI container (`modules/snapshot/di.py`).
- [x] **V. Modular Architecture & Router Subdomain Separation**: Backend code is organized under `modules/snapshot/` and API endpoints are partitioned into subdomain routers (`snapshots.py`, `items.py`, `diff.py`, `tags.py`) under `apps/api/routers/snapshot/` unified by `__init__.py`.

---

## Project Structure

### Documentation (this feature)

```text
specs/004-snapshot-domain/
├── spec.md              # Functional specification with 9 clarified business decisions
├── plan.md              # Implementation plan (this document)
├── research.md          # Phase 0: Technical decisions & algorithms
├── data-model.md        # Phase 1: Pure domain entities & database schema
├── quickstart.md        # Phase 1: End-to-end validation scenarios
├── contracts/           # Phase 1: Interface contracts
│   ├── domain-interfaces.md # Python Protocols for repositories & services
│   └── api-contracts.md     # HTTP REST API contracts & JSON schemas
└── checklists/
    └── requirements.md  # Quality gate checklist (16/16 passing)
```

### Source Code Architecture

```text
modules/snapshot/
├── __init__.py
├── domain/
│   ├── __init__.py
│   ├── entities.py           # SnapshotEntity, SnapshotItemEntity, SnapshotManifestEntity, ReleaseTagEntity
│   ├── value_objects.py      # SplitRatios, SnapshotStatus, SelectionPolicy, SplitStrategy
│   ├── interfaces.py         # Protocols: Repositories, Gateways, Pure Services
│   ├── exceptions.py         # DomainException, SnapshotImmutableError, OntologyIncompatibilityError, etc.
│   └── services/
│       ├── __init__.py
│       ├── checksum_service.py   # Deterministic canonical SHA-256 computation
│       └── stratification_service.py # Pure-Python Multilabel Iterative Stratification
├── application/
│   ├── __init__.py
│   ├── dtos/
│   │   ├── __init__.py
│   │   └── snapshot_dtos.py  # Pydantic v2 request/response schemas
│   └── use_cases/
│       ├── __init__.py
│       ├── create_snapshot.py        # Asynchronous snapshot orchestration
│       ├── cancel_snapshot.py        # Graceful worker abort
│       ├── get_snapshot_detail.py
│       ├── list_snapshots.py
│       ├── list_snapshot_items.py    # Keyset / Offset streaming
│       ├── get_snapshot_manifest.py
│       ├── diff_snapshots.py         # Two-tier diff (summary & items)
│       └── manage_release_tags.py    # Assign, reassign, delete tags
├── infrastructure/
│   ├── __init__.py
│   ├── persistence/
│   │   ├── __init__.py
│   │   └── models.py         # SQLAlchemy 2.0 ORM Models (snapshots, items, manifests, tags)
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── snapshot_repository.py
│   │   ├── snapshot_item_repository.py
│   │   ├── snapshot_manifest_repository.py
│   │   └── release_tag_repository.py
│   ├── gateways/
│   │   ├── __init__.py
│   │   ├── dataset_gateway.py        # Calls Dataset domain (assets & referential guard)
│   │   ├── annotation_gateway.py     # Calls Annotation domain (revision resolution)
│   │   ├── ontology_gateway.py       # Calls Ontology domain (validation)
│   │   └── storage_gateway.py        # MinIO/S3 manifest upload/purge
│   └── background/
│       ├── __init__.py
│       └── snapshot_worker.py        # 60m async execution wrapper with cancellation hook
└── di.py                     # Dishka Provider configuration

apps/api/routers/snapshot/
├── __init__.py               # Top-level unified router
├── snapshots.py              # Create, list, detail, cancel, soft-delete, purge
├── items.py                  # Keyset & offset paginated item queries
├── diff.py                   # Summary KPI diff & granular item diff
└── tags.py                   # Tag assignment, listing, deletion

tests/modules/snapshot/
├── unit/
│   ├── test_entities.py
│   ├── test_checksum_service.py
│   ├── test_stratification_service.py
│   └── test_use_cases.py
└── integration/
    ├── test_snapshot_lifecycle.py
    ├── test_keyset_pagination.py
    ├── test_diff_service.py
    └── test_referential_guard.py
```

---

## Complexity Tracking

> **No violations to justify**. All architectural gates strictly conform to the DUT AI Data Platform Constitution.

| Principle / Gate | Status | Notes |
|---|---|---|
| Domain Purity | Compliant | Pure Python `@dataclass` entities; zero ORM/HTTP leakage |
| Integer User IDs | Compliant | `created_by` strictly typed as non-null positive integer |
| Explicit Transactions | Compliant | Work units encapsulated; no session holding during async I/O |
| Dependency Inversion | Compliant | `typing.Protocol` interfaces injected via Dishka |
| Subdomain Modularity | Compliant | Divided into discrete router files under `apps/api/routers/snapshot/` |
