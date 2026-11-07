# Research & Technical Decisions: Workflow Domain

**Feature**: `002-workflow-domain` | **Date**: 2026-11-04

## 1. Problem Statement & Scope

DUT AI Data Platform currently has 6 modules (`identity`, `project`, `dataset`, `ontology`, `annotation`, `inference`). There is no generic coordination mechanism to track lifecycle transitions, work distribution, batches of tasks, or reviewer approvals across domains. The `Workflow Domain` is designed to be a decoupled, reusable domain that manages **Work Items** and their state lifecycle without coupling to specific domain payloads (annotations, images, etc.).

## 2. Research Findings & Architectural Decisions

### Decision 1: Architecture Pattern & Module Structure
- **Context**: The backend follows Clean Architecture & DDD (modular monolith in `modules/`).
- **Decision**: Add a new module `modules/workflow/` with strict DDD layers:
  ```text
  modules/workflow/
  ├── domain/
  │   ├── entities/      # WorkflowDefinition, WorkItem, Assignment, WorkflowHistory
  │   ├── value_objects/ # WorkItemStatus (Enum), ResourceRef, TransitionRule
  │   ├── interfaces/    # IWorkflowRepository, IWorkItemRepository, IAssignmentRepository, IHistoryRepository
  │   └── services/      # TransitionEngine (State machine validation service)
  ├── application/
  │   ├── dtos/          # Pydantic schemas for requests/responses
  │   └── use_cases/     # CreateWorkflowDefinition, CreateBatchWorkItems, TransitionWorkItem, BulkAssignWorkItems, GetWorkItemHistory
  ├── infrastructure/
  │   ├── persistence/   # SQLAlchemy models & mapper tables
  │   ├── repositories/  # Asyncpg implementation of repository protocols
  │   └── di/            # Dishka provider for Workflow dependencies
  └── presentation/
      └── api/           # FastAPI router for /api/v1/workflows and /api/v1/work-items
  ```
- **Rationale**: Keeps business rules pure Python (no framework/ORM dependencies), complying with project constitution and `backend-development` skill guidelines.

### Decision 2: State Machine & Transition Engine Implementation
- **Context**: Clarifications resolved that v1 uses standard fixed enum states:
  - `Created`, `Assigned`, `InProgress`, `Submitted`, `InReview`, `Approved`, `Rejected`, `Completed`, `Cancelled`.
- **Allowed Transitions**:
  - `Created` -> `Assigned`, `Cancelled`
  - `Assigned` -> `InProgress`, `Cancelled`
  - `InProgress` -> `Submitted`, `Cancelled`
  - `Submitted` -> `InReview`, `Cancelled`
  - `InReview` -> `Approved`, `Rejected`, `Cancelled`
  - `Rejected` -> `Assigned`, `Cancelled`
  - `Approved` -> `Completed`
  - `Completed` -> *Terminal* (no cancellation or transitions)
  - `Cancelled` -> *Terminal*
- **Decision**: Implement `TransitionEngine` as a pure domain service in `modules/workflow/domain/services/transition_engine.py`. Any attempt to perform an unauthorized jump raises a typed `InvalidStateTransitionError`.

### Decision 3: Batching & Bulk Distribution Mechanism
- **Context**: Datasets contain thousands of assets; managers need to group them into batches (e.g. 50 assets per batch) and distribute them evenly across multiple annotators.
- **Decision**:
  - `WorkItem` represents an individual unit or a batch (`resource_type = "ANNOTATION_BATCH"` with `resource_id = <batch_id>`).
  - Batch metadata stores linked asset IDs (`items: list[str]`).
  - `BulkAssignWorkItemsUseCase` accepts `work_item_ids: list[str]` and `assignee_ids: list[int]`, applying round-robin distribution and persisting assignments within a single transaction.

### Decision 4: Concurrency & Lock Handling
- **Context**: What happens when two reviewers attempt to approve/reject the same Work Item concurrently?
- **Decision**: Use PostgreSQL optimistic locking or `SELECT ... FOR UPDATE` row-level lock in the repository when executing state transitions in `modules/workflow/infrastructure/repositories/work_item_repository.py`.

### Decision 5: User ID Typing
- **Context**: Constitution & Feature 001 enforce `user_id` strictly as `int`, while platform resource IDs (`workflow_id`, `work_item_id`, `assignment_id`) are ULID/UUID `str`.
- **Decision**: `assigned_by`, `assignee_id`, and `changed_by` are strictly typed as `int`.

### Decision 6: Real Dataset & Asset Integration for Work Item Batching
- **Context**: Previously, `CreateBatchModal` used static mock counters (`itemCount = 10`) and placeholder strings (`asset_0001`). To reflect real project data, batch creation must retrieve real assets belonging to the project's datasets.
- **Decision**:
  - UI queries datasets of the project via `datasetApi.getProjectDatasets(projectId)` / `useProjectDatasetsQuery`.
  - User selects the specific Dataset and Dataset Version.
  - UI fetches actual assets via `datasetApi.listVersionAssets(selectedVersionId)` / `useVersionAssetsQuery`.
  - Batching logic partitions real asset records into chunks of `batchSize`, extracting their actual database UUIDs (`asset.id`).
  - Backend request DTO `CreateBatchWorkItemsRequest` optionally accepts `dataset_id` and `dataset_version_id`, recording them into `WorkItemEntity.metadata` alongside `asset_ids` and `item_count` for end-to-end data provenance.
- **Rationale**: Preserves domain decoupling (Workflow domain remains domain-agnostic with `resource_type = "ANNOTATION_BATCH"`) while enabling rich UI traceability and real asset labeling workflows.

