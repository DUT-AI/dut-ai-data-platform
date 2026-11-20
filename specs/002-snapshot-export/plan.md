# Implementation Plan: Snapshot-Driven Data Export

**Branch**: `002-snapshot-export` | **Date**: 2026-11-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-snapshot-export/spec.md`

---

## Summary

Build an immutable, reproducible **Snapshot-Driven Data Export** module (`modules/export`) that transforms finalized, frozen Snapshot data into standardized machine learning dataset formats (**YOLO, COCO, CSV, and Canonical JSON/JSONL**). Every export is compiled into a verifiable `.zip` archive on MinIO/S3 with a manifest and SHA-256 integrity checksum, operating via an idempotent, lightweight asynchronous lifecycle directly on the `ExportPackage` entity without managing separate `Export Job` entities.

---

## Technical Context

**Language/Version**: Python 3.12+ (strictly managed via `uv`)  
**Primary Dependencies**: FastAPI, Pydantic v2 (`from_attributes=True`), Dishka DI, SQLAlchemy 2.0 (asyncpg), aiohttp/httpx, zipfile  
**Storage**: PostgreSQL (`export_packages`, `export_items`), MinIO / S3 Object Storage via `core.storage`  
**Testing**: `pytest`, `pytest-asyncio`, `pytest-cov`, `httpx`  
**Target Platform**: Linux / Windows containerized & native server runtimes  
**Project Type**: Web API micro-modular backend service  
**Performance Goals**: Export transformation throughput $\ge 2,000$ annotations/sec; S3 download latency < 50ms for presigned URL delivery  
**Constraints**: Pure domain entities with zero framework dependencies; integer user IDs; scale guard enforcing $\le 2\text{ GB}$ or $\le 5,000$ files for Full Bundle mode; zero unhandled HTTP 504 timeouts  
**Scale/Scope**: Datasets ranging from 100 to 100,000+ items per snapshot  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitutional Principle | Requirement | Plan Compliance | Status |
|---|---|---|:---:|
| **I. Pure Domain Purity** | Zero framework imports (no FastAPI, SQLAlchemy, Pydantic in domain). Domain exceptions inherit from `DomainException`. | `ExportPackageEntity` & `ExportItemEntity` are pure `@dataclass`. Domain exceptions inherit from `DomainException`. Format exporters implement abstract protocol. | **PASS** |
| **II. Unified Integer User IDs** | All user IDs (`created_by`, `user_id`) must be positive integers (`int`). Zero defensive type fallbacks. | `created_by: int` across entity, schema, and database column. | **PASS** |
| **III. Explicit Session Boundaries** | Transactions bound to unit of work; no unilateral `session.rollback()`. | Repositories accept injected `AsyncSession`; commits/flushes scoped cleanly to use cases. | **PASS** |
| **IV. Dependency Inversion** | S3 clients and repositories injected via Dishka container; singleton pooled resources. | `ExportProvider` in `di.py` configures Dishka DI for all use cases, repositories, and gateways. | **PASS** |
| **V. Modular Architecture** | Subdomain separation under `modules/export/` and `apps/api/routers/export/`. | Distinct `modules/export/` module with dedicated router `apps/api/routers/export/exports.py`. | **PASS** |

*All constitutional gates passed with zero violations.*

---

## Project Structure

### Documentation (this feature)

```text
specs/002-snapshot-export/
├── spec.md              # Feature specification & clarification log
├── plan.md              # This implementation plan
├── research.md          # Phase 0: Architectural decisions & technology evaluation
├── data-model.md        # Phase 1: Entity definitions, database schema & S3 layout
├── contracts/           # Phase 1: OpenAPI specification
│   └── export-api.yaml
└── quickstart.md        # Phase 1: End-to-end runnable validation guide
```

### Source Code Layout

```text
modules/export/
├── domain/
│   ├── entities.py              # ExportPackageEntity, ExportItemEntity
│   ├── value_objects.py         # ExportStatus, ExportFormatType, MediaMode
│   ├── interfaces.py            # ExportPackageRepository, ExportItemRepository, SnapshotGateway
│   ├── exceptions.py            # IncompatibleFormatError, ScaleLimitExceededError, etc.
│   └── services/
│       ├── base_exporter.py     # Abstract IFormatExporter protocol
│       ├── canonical_exporter.py# Canonical JSON & JSONL exporters
│       ├── yolo_exporter.py     # YOLO Object Detection exporter
│       ├── coco_exporter.py     # COCO Vision exporter
│       ├── csv_exporter.py      # Classification & Tabular CSV exporter
│       └── archiver_service.py  # ZIP stream, manifest & SHA-256 builder
├── application/
│   ├── dtos/
│   │   └── export_dtos.py       # ExportCreateRequest, ExportPackageResponse, etc.
│   └── use_cases/
│       ├── create_export_package.py
│       ├── get_export_package.py
│       ├── list_export_packages.py
│       ├── get_export_download_url.py
│       └── delete_export_package.py
├── infrastructure/
│   ├── persistence/
│   │   └── models.py            # SQLAlchemy ExportPackageModel, ExportItemModel
│   ├── repositories/
│   │   ├── export_package_repository.py
│   │   └── export_item_repository.py
│   ├── gateways/
│   │   ├── snapshot_gateway.py  # Gateway reading from modules.snapshot
│   │   └── s3_storage_gateway.py# S3 upload & presigned URL generator
│   └── background/
│       └── export_worker.py     # Background transformation & zip builder
└── di.py                        # Dishka DI Provider

apps/api/routers/export/
├── __init__.py                  # Subdomain router export
└── exports.py                   # FastAPI REST routes

migrations/versions/
└── 015_create_export_domain_tables.py # Alembic migration for export_packages & export_items

tests/
├── test_export_domain_unit.py   # Unit tests for domain entities & invariants
├── test_format_exporters.py     # Unit tests for YOLO, COCO, CSV, JSON exporters
└── test_export_api_full.py      # Integration tests for export REST endpoints
```

**Structure Decision**: Fully decoupled clean architecture submodule following the proven layout of `modules/snapshot` and `modules/dataset`.

---

## Complexity Tracking

*No constitutional violations identified. Standard clean architecture patterns applied.*
