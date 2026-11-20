# Feature Specification: Snapshot Domain & Immutable Dataset Publishing

**Feature Branch**: `004-snapshot-domain`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "/speckit-specify @docs/Snapshot Domain 3a998e2c5a1d80e495eadea8675fa1f5.md:L1-L402 Kiểm tra lại và bổ sung các nghiệp vụ cần thiết cho domain snapshot"

---

## Clarifications

### Session 2026-11-11
- Q: How should the stratified split algorithm handle assets that contain multiple annotation classes or unannotated samples? (FR-010) → A: Use multilabel iterative stratification across all present labels to balance co-occurring classes proportionally, and distribute unannotated assets uniformly across splits matching configured ratios.
- Q: How should snapshot deletion and lifecycle archiving behave when a snapshot has no active dependencies? (FR-002, User Story 5) → A: Support dual deletion mechanisms: soft-deletion transitions the snapshot to `ARCHIVED` status by default (preserving database records and manifest on object storage for audit and diffing, while blocking new downstream tasks); hard-deletion is strictly restricted to Project Owners to permanently purge snapshot items and stored manifests.
- Q: How should snapshot version naming and uniqueness be constrained within a project? (FR-001, Key Entities) → A: Snapshot `version_name` MUST be unique per project (`UNIQUE(project_id, version_name)`). It is optional on creation; if omitted, the system auto-generates sequential version names (`v1`, `v2`, `v3`...), while user-provided names are suggested to follow Semantic Versioning (e.g., `v1.0.0`).
- Q: How should upstream data deletion or modification requests be handled for assets, annotation revisions, or dataset versions pinned by a READY or ARCHIVED snapshot? (FR-003, Assumptions) → A: Upstream domains MUST enforce referential restriction (RESTRICT hard-deletions) on any Dataset Version, Asset, or Annotation Revision referenced by a READY or ARCHIVED snapshot. If upstream soft-deletes an entity, database records and physical object storage files must remain intact and readable by Snapshot queries.
- Q: How should integrity checksums (item_checksum and aggregate_checksum) be standardized and computed? (FR-012, FR-013, SC-005) → A: Standardize on SHA-256: `item_checksum` is the SHA-256 hash of a deterministic canonical JSON string composed of `asset_id`, `asset_checksum`, `annotation_revision_id`, and `split`; `aggregate_checksum` in the manifest is the SHA-256 digest computed across the lexicographically sorted list of all member `item_checksum` values.
- Q: How should asynchronous snapshot creation cancellation and execution timeouts be handled? (FR-002, Edge Cases) → A: Allow manual cancellation while in `CREATING` status by the creator or Project Admin, transitioning status to `FAILED` with error reason `cancelled_by_user`; enforce a hard execution timeout of 60 minutes for the background worker, automatically transitioning overdue/stalled jobs to `FAILED` with error reason `creation_timeout` and cleaning up partial data.
- Q: Which pagination strategy and page size limits should the Snapshot Items query API enforce? (Edge Cases, Downstream Consumption) → A: Use Keyset/Cursor-based pagination (by item ID) as the primary mechanism for downstream streaming and high-volume retrieval (default: 100, maximum: 1,000 items per request), while supporting offset pagination for interactive UI inspection.
- Q: How should the Snapshot Diff service structure its report data and handle large-scale comparisons? (User Story 4, FR-015) → A: Implement a two-tier response pattern: the primary diff endpoint immediately returns high-level metric summaries (counts of added, removed, modified, and split-reassigned assets, plus per-category frequency shifts); a dedicated sub-resource endpoint provides paginated, filterable item-level diff details on demand.
- Q: How should release tags behave regarding mutability and assignment across snapshots? (User Story 5, FR-020) → A: Release tags act as mutable aliases (unique per project, e.g. "production", "staging") pointing to exactly one READY snapshot at a time; Project Owners and Admins can reassign, create, or delete tags to redirect automated downstream pipelines without altering the immutable version_name.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Immutable Snapshot with Quality & Ontology Gating (Priority: P1)

As a Project Admin or ML Engineer, I want to create an immutable snapshot from a specific Dataset Version and published Ontology Version, selecting only verified annotations according to project policies, so that downstream training and export pipelines have a completely reproducible, non-corruptible source of truth.

**Why this priority**: Without immutable snapshots, active annotations or dataset modifications continuously alter the dataset state, breaking machine learning reproducibility and audit trails. This is the core foundational capability of the entire domain.

**Independent Test**: Can be independently tested by requesting a snapshot from a Dataset Version containing 10 assets with multiple annotation revisions. The system creates a snapshot in `READY` status referencing exactly the approved revisions, generates an integrity checksum for each item, and ensures no subsequent changes can mutate the snapshot.

**Acceptance Scenarios**:

1. **Given** a valid Dataset Version and a published Ontology Version belonging to the same project, **When** a user initiates snapshot creation with policy `LATEST_APPROVED`, **Then** the system collects all assets from that dataset version, resolves their latest approved annotation revisions, verifies each revision conforms to the ontology version, and marks the snapshot `READY`.
2. **Given** an asset within the dataset version has an annotation revision violating the selected Ontology Version, **When** snapshot creation executes, **Then** the process fails with a detailed ontology incompatibility error, records the failure reason, and marks the snapshot status as `FAILED`.
3. **Given** assets without any annotations, **When** snapshot creation specifies `include_unannotated=true`, **Then** the snapshot items are created with empty annotation references (for negative/background training samples); when `include_unannotated=false`, unannotated assets are excluded from the snapshot.
4. **Given** a snapshot in `READY` status, **When** any user attempts an update or delete operation on its items or manifest, **Then** the operation is strictly rejected by the immutability enforcement rule.

---

### User Story 2 - Configurable Dataset Split Allocation (Priority: P1)

As an ML Engineer, I want to partition snapshot items into deterministic Train, Validation, and Test splits using configurable strategies (Random with seed or Stratified by class labels), so that model training and benchmark evaluations avoid data leakage and maintain statistical class balance.

**Why this priority**: Training machine learning models requires well-separated, reproducible splits. Without deterministic splitting and stratification, model performance evaluation is untrustworthy and prone to distribution skew.

**Independent Test**: Create a snapshot specifying a 70/15/15 split ratio with a fixed random seed. Running the split generation repeatedly on identical inputs must yield the exact same split assignment across all items.

**Acceptance Scenarios**:

1. **Given** a snapshot creation request with split ratios `70% train`, `15% validation`, and `15% test` and random seed `42`, **When** the split assignment completes, **Then** every snapshot item is assigned exactly one split matching the ratio within rounding tolerance.
2. **Given** a stratified split strategy on assets with multi-label annotations and unannotated samples, **When** splitting is computed using multilabel iterative stratification, **Then** the frequency distribution of ontology categories in each split proportionally mirrors the overall dataset class distribution within rounding tolerance, and unannotated samples are distributed across splits matching the configured split ratio.
3. **Given** an invalid split ratio configuration (e.g., percentages summing to 90% or negative values), **When** submitted, **Then** the system rejects the request immediately with a validation error before creating the snapshot job.

---

### User Story 3 - Snapshot Manifest & Audit Metadata Generation (Priority: P1)

As an Auditor or Downstream Pipeline (Export/Training/Eval), I want a comprehensive manifest containing summary statistics, split distribution metrics, category frequencies, and data integrity digests, so that external consumers can inspect and verify the dataset version before pulling data.

**Why this priority**: Consumers (such as Export Jobs and Model Training) need high-level metadata and class distributions without scanning millions of individual records.

**Independent Test**: Fetch the manifest of a completed snapshot and verify that total asset count, total annotation count, per-split counts, and per-class frequencies match the actual aggregated snapshot items.

**Acceptance Scenarios**:

1. **Given** a successfully finalized snapshot, **When** the manifest is generated, **Then** it contains total asset count, total annotation count, split distribution summaries (item count and percentage per split), category distribution per split, and an aggregate integrity checksum.
2. **Given** a downstream consumer query, **When** requesting the snapshot manifest, **Then** the manifest returns structured metadata alongside a persistent URI linking to the frozen canonical manifest file.

---

### User Story 4 - Snapshot Comparison & Diff Analysis (Priority: P2)

As a Project Manager or ML Researcher, I want to compare two snapshots of the same project, so that I can clearly see what assets were added or removed, which annotations were updated, and how class distributions shifted between versions.

**Why this priority**: Iterative dataset curation requires understanding what changed between model iterations. This informs whether accuracy shifts are due to new data, relabeling, or class imbalance.

**Independent Test**: Compare Snapshot v1 and Snapshot v2 where 5 assets were added, 2 assets had revisions changed, and 1 asset changed split. The diff service returns exact sets of added, removed, modified, and split-reassigned items.

**Acceptance Scenarios**:

1. **Given** two distinct snapshots of the same project, **When** a diff request is issued, **Then** the primary diff service returns an immediate summary report detailing:
   - Added asset count (in B but not in A)
   - Removed asset count (in A but not in B)
   - Retained assets with modified annotation revision count
   - Split movement count (e.g., asset moved from train to test)
   - Label count delta per category.
   **When** granular item details are requested, a dedicated paginated endpoint returns individual asset IDs filtered by change type without overloading the API.
2. **Given** two snapshots from different projects, **When** a diff is requested, **Then** the request is rejected as an invalid comparison.

---

### User Story 5 - Snapshot Lifecycle & Safe Deletion Guardrails (Priority: P3)

As a Project Owner, I want to manage the lifecycle of snapshots (tagging, archiving, and deletion protection), so that obsolete snapshots can be organized while active snapshots referenced by ongoing export jobs or training runs cannot be accidentally destroyed.

**Why this priority**: Prevents orphaned dependencies and accidental data destruction in multi-user collaborative environments.

**Independent Test**: Attempt to delete a snapshot currently referenced by an in-progress export job; the deletion must be blocked. When the export job finishes, soft-deleting/archiving the snapshot succeeds.

**Acceptance Scenarios**:

1. **Given** a snapshot in `READY` status, **When** an authorized user assigns a release tag (e.g., `prod`), **Then** the tag acts as a mutable alias unique per project (`UNIQUE(project_id, tag_name)`); if the tag was previously assigned to an older snapshot, it is atomically reassigned to the new snapshot, allowing automated downstream pipelines to track stable alias targets without editing code.
2. **Given** a snapshot actively referenced by an active downstream job (export or training), **When** a deletion request is made, **Then** the operation is rejected with an active dependency conflict.
3. **Given** a snapshot with no active dependencies, **When** deleted by an authorized member, **Then** it transitions to `ARCHIVED` status (soft-delete), preventing new downstream tasks from selecting it while retaining audit records and manifest; **When** hard-deletion is explicitly executed by a Project Owner, **Then** the snapshot records, items, and object storage manifest are permanently purged.

---

### Edge Cases

- **Empty Dataset Version**: Creating a snapshot from a dataset version with 0 assets must fail with a descriptive error (`dataset_version_empty`).
- **Duplicate Version Name**: Submitting a user-specified `version_name` that already exists in the same project must fail with a conflict error (`snapshot_version_already_exists`).
- **Concurrent Creation**: If multiple snapshot creation requests are triggered simultaneously for the same dataset version, each receives a unique snapshot version and operates in an isolated transaction.
- **Async Failure Recovery & Timeout**: If the snapshot worker process encounters an unhandled infrastructure error or exceeds the hard execution timeout of 60 minutes, the snapshot status is transitioned to `FAILED` with error code `creation_timeout`, purging any partial item allocations and releasing `CREATING` locks.
- **Manual Job Cancellation**: The creator or a Project Admin can cancel an in-progress snapshot in `CREATING` status via API; the system aborts worker processing gracefully, cleans up partial items, and marks the snapshot `FAILED` with reason `cancelled_by_user`.
- **Orphan Revision Detection**: If an annotation revision was deleted or marked invalid before snapshot finalization, the validator aborts finalization and marks the snapshot `FAILED`.
- **Large Dataset Pagination**: Listing snapshot items enforces a maximum page size of 1,000 items and leverages Keyset/Cursor-based indexing (O(1) seek) to guarantee constant-time streaming performance across snapshots with hundreds of thousands of items.
- **Strict User Identity**: Every snapshot operation (creation, tagging, archiving) must record non-null positive integer user IDs for traceability.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Core Snapshot Lifecycle & Immutability
- **FR-001**: System MUST create a snapshot from a specified Dataset Version and published Ontology Version belonging to the same project. Each snapshot MUST have a `version_name` unique within the project (`UNIQUE(project_id, version_name)`). The version name is optional on creation: if omitted, the system auto-generates sequential version names (`v1`, `v2`, ...); if provided by user, the interface encourages Semantic Versioning (e.g., `v1.0.0`).
- **FR-002**: System MUST enforce snapshot states: `CREATING` (in progress), `READY` (finalized and immutable), `ARCHIVED` (soft-deleted/decommissioned), and `FAILED` (aborted with error reason, including `creation_timeout` after 60 minutes or `cancelled_by_user`).
- **FR-003**: System MUST prohibit any modification, item addition, item removal, or split reassignment once a snapshot reaches `READY` status. Upstream domains MUST enforce referential protection (RESTRICT hard deletion) on any Dataset Version, Asset, or Annotation Revision referenced by a `READY` or `ARCHIVED` snapshot, preserving database records and object storage files for reproducibility.
- **FR-004**: System MUST enforce that each asset from the source dataset version appears at most once in a given snapshot.

#### Annotation Resolution & Policy Gating
- **FR-005**: System MUST support configurable annotation revision selection policies:
  - `LATEST_APPROVED` (default): Only include revisions with approved QA status.
  - `LATEST_SUBMITTED`: Include the latest submitted revision regardless of review status.
- **FR-006**: System MUST allow configuring whether unannotated assets are included (`include_unannotated=true` with null annotation revision) or excluded (`include_unannotated=false`).
- **FR-007**: System MUST validate that all resolved annotation revisions strictly conform to the referenced Ontology Version before finalizing the snapshot.

#### Split Allocation & Distribution
- **FR-008**: System MUST support deterministic dataset splitting into `train`, `validation`, and `test` splits based on specified split percentages summing to 100%.
- **FR-009**: System MUST support reproducible random splitting via an explicit or auto-generated random seed.
- **FR-010**: System MUST support stratified splitting using multilabel iterative stratification to preserve the class category distribution across splits for multi-label assets, while distributing unannotated assets proportionally according to split percentages.
- **FR-011**: System MUST assign every item in the snapshot to exactly one split.

#### Integrity & Manifest
- **FR-012**: System MUST compute an integrity checksum (`item_checksum`) for every snapshot item using SHA-256 over a deterministic canonical JSON string composed of `asset_id`, `asset_checksum`, `annotation_revision_id`, and `split`.
- **FR-013**: System MUST generate an immutable Snapshot Manifest upon finalization containing:
  - Dataset Version reference and Ontology Version reference.
  - Total asset count and total annotation count.
  - Per-split distribution counts and percentages.
  - Per-category label frequency counts across the entire snapshot and per split.
  - Overall dataset integrity digest (`aggregate_checksum`), computed as the SHA-256 hash of the lexicographically sorted list of all member `item_checksum` values.
  - Object storage URI pointing to the frozen canonical manifest file.
- **FR-014**: System MUST store the canonical manifest document in reliable object storage and expose structured query access via the platform API.

#### Comparison & Downstream Consumption
- **FR-015**: System MUST provide a Snapshot Diff service to compare two snapshots within the same project. The primary diff endpoint MUST return an immediate summary report containing aggregate counts of added, removed, modified annotation, and split-reassigned assets, along with per-category distribution shifts. Granular item-level deltas MUST be queryable through a dedicated paginated endpoint.
- **FR-016**: Downstream domains (Export, Training, Evaluation) MUST be restricted to consuming only snapshots with `READY` status.
- **FR-017**: System MUST block the deletion or archival of any snapshot currently referenced by active downstream jobs. Deletion defaults to soft-delete (transitioning to `ARCHIVED`). Hard-delete (permanent purge of records and object storage manifest) MUST be restricted strictly to Project Owners.
- **FR-018**: System MUST record non-null integer identifiers for the creator and modifier of all snapshot operations.
- **FR-019**: System MUST provide a paginated query interface for listing snapshot items supporting Keyset/Cursor-based pagination as the primary mechanism for downstream streaming (default: 100 items, maximum: 1,000 items per request), while supporting offset pagination for interactive UI inspection.
- **FR-020**: System MUST support mutable release tags (e.g., "production", "staging") unique within a project (`UNIQUE(project_id, tag_name)`), pointing to exactly one `READY` snapshot. Authorized users MUST be able to create, reassign, or remove tags across `READY` snapshots without altering underlying immutable snapshot data.

---

### Key Entities *(include if feature involves data)*

- **Snapshot**: Aggregate root representing an immutable dataset release.
  - Attributes: `id` (int/uuid), `project_id` (int), `dataset_version_id` (int), `ontology_version_id` (int), `version_name` (string, unique per project, auto-generated sequential or user-specified SemVer), `status` (`CREATING`, `READY`, `ARCHIVED`, `FAILED`), `selection_policy` (string), `split_strategy` (string), `split_seed` (int, optional), `error_message` (string, optional), `created_by` (int), `created_at`, `finalized_at`, `archived_at` (optional).
- **Snapshot Item**: A discrete data point member of the snapshot.
  - Attributes: `id`, `snapshot_id`, `asset_id`, `annotation_revision_id` (optional, null for unannotated samples), `split` (`train`, `validation`, `test`), `item_checksum` (string).
- **Snapshot Manifest**: Summary metrics and audit descriptor of the snapshot.
  - Attributes: `snapshot_id`, `asset_count` (int), `annotation_count` (int), `split_distribution` (dictionary of split counts and ratios), `class_distribution` (dictionary of class frequencies per split), `aggregate_checksum` (string), `storage_uri` (string).
- **Snapshot Diff Report**: Ephemeral or cached analytical comparison between two snapshots.
  - Attributes: `base_snapshot_id`, `target_snapshot_id`, `added_asset_count`, `removed_asset_count`, `modified_annotation_count`, `split_change_count`, `class_frequency_delta`.
- **Release Tag (Snapshot Tag)**: Mutable alias pointing to a specific READY snapshot.
  - Attributes: `id`, `project_id` (int), `snapshot_id`, `name` (string, unique per project), `created_by` (int), `created_at`, `updated_at`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of finalized (`READY`) snapshots are strictly immutable; zero data modifications can be performed on their member items or manifests.
- **SC-002**: Snapshot creation for a dataset version with up to 10,000 items completes in under 30 seconds when run asynchronously.
- **SC-003**: Random dataset splitting with a fixed seed produces 100% identical split allocations across multiple runs on the same input dataset version.
- **SC-004**: Stratified splitting produces class frequency distributions in `train`, `validation`, and `test` splits that deviate by no more than 2% from the global class distribution.
- **SC-005**: 100% of snapshot items pass deterministic SHA-256 integrity checksum verification, and re-computing the aggregate digest over sorted item checksums matches the manifest digest exactly.
- **SC-006**: Snapshot diff comparison between two 10,000-item snapshots calculates and returns the complete delta report in under 3 seconds.

---

## Assumptions

- Dataset Versions and Ontology Versions are created and managed by their respective domains (`dataset` and `ontology`) and are already published prior to snapshot creation. Once referenced by a finalized snapshot, these upstream entities (including member assets and annotation revisions) are protected against hard deletion.
- Downstream domains (Export Domain in Phase 3B, Training, Evaluation) will look up snapshot IDs and query snapshot items directly through domain contracts.
- Object storage (MinIO/S3) is available and healthy for persisting canonical manifest JSON files.
- User authorization and role checking follow platform standard RBAC (Project Owner/Admin can create and archive snapshots; Project Members can read and diff snapshots).

