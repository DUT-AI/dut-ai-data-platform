# Phase 0: Technical Research & Architectural Decisions

**Feature**: Snapshot-Driven Data Export  
**Branch**: `002-snapshot-export`  
**Date**: 2026-11-20  

---

## 1. Context & Objectives

The DUT AI Data Platform requires a robust, reproducible, and scalable data export mechanism that operates strictly upon finalized, immutable **Snapshots**. The Export Domain must not depend on live, mutable datasets or active annotations, and must avoid maintaining heavy `Export Job` entities or complex job state machines.

This document records the architectural analysis, technology evaluations, and concrete decisions that govern the implementation of the Export Domain.

---

## 2. Key Decisions & Rationales

### Decision 1: Lightweight Asynchronous Lifecycle via `ExportPackage` State
- **Problem**: Large datasets and full-bundle exports (packaging labels and media) can take 5–60 seconds, which exceeds standard HTTP gateway timeouts (e.g. 30–60s) and risks connection dropouts. At the same time, the project constitution and requirements explicitly forbid creating a separate `Export Job` entity.
- **Decision**: Manage the export lifecycle directly within the `ExportPackage` entity:
  - Initial state: `PROCESSING`
  - Terminal states: `READY` or `FAILED`
  - API triggers `POST /projects/{project_id}/snapshots/{snapshot_id}/exports`, immediately persists an `ExportPackage` record in `PROCESSING` status, and dispatches a background task (`ExportWorker` via `asyncio.create_task`), returning `HTTP 202 Accepted`.
  - Client polls `GET /projects/{project_id}/exports/{package_id}` until `status == "ready"`.
- **Rationale**: Keeps the domain model clean without an extraneous job entity while preventing HTTP 504 Gateway Timeout errors.
- **Alternatives Considered**:
  - *Synchronous HTTP execution*: Rejected because compressing 5,000 files or large JSON lines blocks the client request and will timeout under standard reverse proxies.
  - *Separate `ExportJob` state machine*: Explicitly rejected by architectural requirements (FR-002, FR-010) to avoid entity proliferation.

---

### Decision 2: Universal `.zip` Packaging with SHA-256 Manifest
- **Problem**: Downstream ML engineers need a consistent, tamper-proof archive regardless of format (whether single-file CSV, JSONL, or multi-directory YOLO/COCO).
- **Decision**: All export packages are assembled into a self-contained `.zip` archive containing:
  - Format-specific directory structure (e.g., `labels/train/`, `images/train/`, `data.yaml` for YOLO; `annotations/instances_train.json` for COCO; `dataset.csv` for CSV).
  - Internal `manifest.json` describing dataset lineage, counts, classes, and split statistics.
  - Whole-archive SHA-256 checksum calculated during compression and recorded in the database.
- **Rationale**: Eliminates format ambiguity for client tools, ensures 100% integrity validation before release, and provides atomic single-file distribution.
- **Alternatives Considered**:
  - *Uncompressed S3 folder structure*: Rejected due to complex multi-file downloads and higher risk of partial file corruption.
  - *Format-dependent packaging (e.g., raw CSV for classification)*: Rejected because manifest and checksum cannot be bundled cleanly with a bare CSV.

---

### Decision 3: Idempotent Export Deduplication Key
- **Problem**: Multiple users or automated pipelines might trigger identical export requests for the same Snapshot and format, wasting compute and storage.
- **Decision**: Enforce idempotency using a deterministic composite uniqueness constraint:
  $$\text{Deduplication Key} = \text{Hash}(\text{snapshot\_id}, \text{export\_format}, \text{target\_output\_id}, \text{media\_mode}, \text{annotated\_only})$$
  - If a package with this combination already exists with status `READY`, return `HTTP 200 OK` with the existing package.
  - If a package is currently `PROCESSING`, return `HTTP 202 Accepted` pointing to the in-flight package without launching duplicate workers.
- **Rationale**: Saves server CPU, avoids duplicate S3 storage usage, and guarantees deterministic export packages.

---

### Decision 4: Format Exporter Strategy Pattern
- **Problem**: The system must support diverse AI task formats (Vision, Tabular, Text) and be extensible for future formats (Pascal VOC, Hugging Face Dataset) without touching core orchestration.
- **Decision**: Implement an isolated `IFormatExporter` protocol:
  ```python
  class IFormatExporter(Protocol):
      format_code: str
      def is_compatible(self, snapshot_manifest: dict, target_output_id: str | None) -> bool: ...
      async def export(self, context: ExportContext) -> AsyncIterable[ExportItemFile]: ...
  ```
  Concrete exporters:
  - `CanonicalJsonExporter`: Exports raw multi-output items to JSON/JSONL.
  - `YoloExporter`: Maps bounding boxes to normalized `[class_idx x_center y_center width height]` with `data.yaml`.
  - `CocoExporter`: Maps vision annotations to standard COCO JSON format.
  - `CsvExporter`: Flattens classification/tabular items into tabular CSV.
- **Rationale**: Conforms to Open/Closed Principle. Adding a new format only requires registering a new class.

---

### Decision 5: Presigned MinIO/S3 URL Delivery
- **Problem**: Streaming multi-gigabyte ZIP bundles through FastAPI consumes API worker processes, memory buffers, and bandwidth.
- **Decision**: Use `StorageGateway` (boto3 / MinIO client) to generate time-limited Presigned GET URLs (30-minute expiration). Endpoint `GET /projects/{project_id}/exports/{package_id}/download` validates project Owner/Admin authorization and redirects (HTTP 307) or returns the presigned URL.
- **Rationale**: Zero backend memory footprint during download; offloads transfer directly to high-throughput object storage.

---

### Decision 6: Scale Limits & Upfront Protection
- **Problem**: Users selecting `FULL_BUNDLE` mode on large snapshots could exhaust local disk during zip archiving or overload MinIO.
- **Decision**: Enforce pre-flight validation gates before background archiving starts:
  - Maximum media count: 5,000 files.
  - Maximum media volume: 2.0 GB.
  - If exceeded, reject immediately with `ScaleLimitExceededError` (HTTP 400) advising the user to export in `LABELS_ONLY` mode.

---

## 3. Technology Stack Alignment

| Component | Technology Choice | Constitutional Alignment |
|---|---|---|
| Domain Layer | Pure Python `@dataclass`, standard library | Principle I: Zero framework imports |
| Identity & Auth | `int` user IDs (`created_by`), Owner/Admin RBAC | Principle II: Unified Integer User Identifiers |
| Persistence | PostgreSQL + SQLAlchemy 2.0 (asyncpg), Alembic migration | Quality Constraints |
| Object Storage | MinIO / S3 via `core.storage` adapter | Principle IV: Dependency Inversion |
| DI Container | Dishka (`Provider`, `Scope.APP`, `Scope.REQUEST`) | Principle IV: Dependency Inversion |
| API Layer | FastAPI modular subdomain router | Principle V: Router Subdomain Separation |
