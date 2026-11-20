# Technical Research: Snapshot Domain & Immutable Dataset Publishing

**Feature Branch**: `004-snapshot-domain`  
**Date**: 2026-11-19  
**Status**: Completed  

---

## 1. Multilabel Iterative Stratification for Dataset Splitting

### Context & Problem
FR-010 and SC-004 require splitting datasets into `train`, `validation`, and `test` subsets while maintaining class frequency balance within a 2% deviation threshold. In computer vision and multi-modal AI datasets, individual assets often contain multiple annotations of differing classes (e.g. bounding boxes for both `car` and `pedestrian`), and some assets contain zero annotations (`include_unannotated=true`). Standard single-label stratification (like `train_test_split(stratify=y)`) fails because a single asset cannot be independently assigned to multiple splits.

### Decision
Implement a pure-Python, zero-heavy-dependency **Iterative Stratification** algorithm based on the Sechidis et al. (2011) methodology:
1. Represent each asset as an indicator/count vector of ontology classes.
2. Assets without annotations are separated and distributed proportionally across `train`, `validation`, and `test` splits matching the exact ratio percentages using the seeded pseudorandom generator.
3. For annotated assets, prioritize sorting by the rarest classes (classes with the fewest overall occurrences in the dataset). For each asset with rare labels, allocate it to the split that currently has the largest deficit relative to its target proportion for that class.
4. Ties are broken deterministically using a seeded pseudo-random number generator (`hashlib.sha256(f"{seed}:{asset_id}".encode())` or Python `random.Random(seed)`).

### Rationale
- Completely deterministic given the same inputs and seed (satisfies SC-003).
- Operates in pure Python with standard library / lightweight numpy, satisfying Constitution Principle I (Pure Domain Purity, zero C-extension/framework coupling in domain).
- Guarantees class distribution balance across splits within the ≤ 2% tolerance (satisfies SC-004).

### Alternatives Considered
- *Scikit-multilearn (`iterative_train_test_split`)*: Rejected because adding `scikit-multilearn` introduces legacy scipy/sklearn dependencies into the domain layer, violating protocol agnosticism and domain purity.
- *Primary label stratification*: Rejected during clarification (Option B) because prioritizing only dominant classes distorts the distribution of secondary or co-occurring classes.

---

## 2. Deterministic Canonical Integrity Checksum Computation

### Context & Problem
FR-012, FR-013, and SC-005 require computing reproducible integrity checksums for each snapshot item (`item_checksum`) and an aggregate manifest digest (`aggregate_checksum`). If field serialization or key ordering is non-deterministic, checksums will fail across different platforms, architectures, or Python versions.

### Decision
1. **Item Checksum (`item_checksum`)**:
   - Construct a normalized dictionary with canonical keys:
     ```python
     canonical_dict = {
         "annotation_revision_id": item.annotation_revision_id,
         "asset_checksum": item.asset_checksum,
         "asset_id": item.asset_id,
         "split": item.split,
     }
     ```
   - Serialize with `json.dumps(canonical_dict, sort_keys=True, separators=(',', ':'))`.
   - Compute `hashlib.sha256(canonical_bytes).hexdigest()`.
2. **Aggregate Checksum (`aggregate_checksum`)**:
   - Collect all member `item_checksum` strings into a list.
   - Sort the list lexicographically: `sorted_checksums = sorted(item_checksums)`.
   - Concatenate with a standard newline delimiter: `"\n".join(sorted_checksums).encode("utf-8")`.
   - Compute `hashlib.sha256(digest_bytes).hexdigest()`.

### Rationale
- Standardized across programming languages (RFC 8785 JSON Canonicalization Scheme principles).
- Lexicographical sort makes the aggregate checksum completely order-independent with respect to database query return order.
- Linear O(N log N) complexity computes in < 1 second for 100,000 items in Python.

### Alternatives Considered
- *Merkle Tree Root*: Rejected during clarification (Option B) due to unnecessary tree-pointer serialization complexity when partial proofs are not required by downstream consumers.
- *Hashing raw binary asset files from S3*: Rejected during clarification (Option C) because reading gigabytes of media binaries across network I/O during snapshot finalization introduces extreme latency and network bottlenecks.

---

## 3. Asynchronous Worker Execution, Cancellation & 60-Minute Timeout

### Context & Problem
Creating snapshots with 10,000 to 500,000 items involves asset resolution, ontology validation, iterative stratification, checksum hashing, S3 manifest upload, and bulk database insertion. This cannot run synchronously in the HTTP request cycle. Additionally, users must be able to cancel long-running jobs, and stalled workers must auto-terminate after 60 minutes.

### Decision
1. **Execution Model**:
   - `POST /api/v1/projects/{project_id}/snapshots` creates the `Snapshot` row with status `CREATING` and returns `HTTP 202 Accepted` immediately with the snapshot resource and location header.
   - The execution is scheduled via platform background task runner / task queue.
2. **Cancellation**:
   - A dedicated endpoint `POST /api/v1/projects/{project_id}/snapshots/{snapshot_id}/cancel` checks if status is `CREATING`.
   - Sets a cancellation flag/event. The worker checks for cancellation at batch boundaries.
   - Worker rolls back or deletes partial allocations, deletes any orphaned S3 manifest, and transitions snapshot status to `FAILED` with `error_code="cancelled_by_user"`.
3. **Hard Timeout**:
   - The background worker executes inside an async timeout context: `asyncio.timeout(3600)`.
   - If 60 minutes elapse without finalization, `TimeoutError` is caught, transitioning the snapshot status to `FAILED` with `error_code="creation_timeout"` and clearing locks.

### Rationale
- Complies with SC-002 asynchronous SLA.
- Directly satisfies Question 6 clarification agreement.
- Prevents resource exhaustion and database session locking (Constitution Principle III).

---

## 4. Keyset / Cursor-Based Pagination for High-Throughput Streaming

### Context & Problem
A snapshot can contain 100,000+ items. Export pipelines (e.g. YOLO, COCO, TFRecord exporters) and training loaders need to stream all items efficiently. Using `OFFSET / LIMIT` results in quadratic scan costs $O(N^2)$ for large offsets, causing database degradation.

### Decision
1. **Primary Keyset Pagination**:
   - Each `SnapshotItem` uses a sortable 26-character ULID as its primary key `id`.
   - Query: `SELECT * FROM snapshot_items WHERE snapshot_id = :snapshot_id AND id > :cursor ORDER BY id ASC LIMIT :limit`.
   - Parameters: `limit` (default: 100, max: 1,000), `cursor` (last seen item ULID).
   - Response includes items and `next_cursor` (the `id` of the last item in the page, or `null` if exhausted).
2. **Secondary Offset Pagination**:
   - For interactive UI page navigation, support `page` and `page_size` parameters for modest offsets (enforced maximum page offset to protect database health).

### Rationale
- $O(1)$ index seek using B-tree index on `(snapshot_id, id)`.
- Eliminates page drift and duplicate reads even if concurrent reads occur.
- Directly satisfies Question 7 clarification agreement.

---

## 5. Canonical Manifest Storage & Immutability Enforcement

### Context & Problem
Downstream domains (Export in Phase 3B, Training, External Auditors) need an immutable, standalone descriptor of the dataset release. Storing large JSON manifests in relational database columns alone risks hitting row size limits and complicates direct S3 pre-signed downloads.

### Decision
1. The Manifest is persisted in two locations:
   - **Object Storage (MinIO/S3)**: Stored as a canonical JSON file at `projects/{project_id}/snapshots/{snapshot_id}/manifest.json`.
   - **Database (`snapshot_manifests` table)**: Structured relational metadata containing summary counts (`asset_count`, `annotation_count`), distribution JSONB, `aggregate_checksum`, and `storage_uri`.
2. **Immutability Enforcement**:
   - Pure domain invariant in `SnapshotAggregate`: once status is `READY` or `ARCHIVED`, all domain mutation methods raise `SnapshotImmutableError`.
   - Repository update operations explicitly reject modifications to `READY` snapshots.
   - S3 storage bucket policies set object lock / WORM where applicable.

---

## 6. Two-Tier Snapshot Diff Architecture

### Context & Problem
Comparing two snapshots of 50,000 items each requires determining set differences across assets, revisions, and splits. Returning a monolithic list of 50,000 changes in one payload overwhelms browser memory and network bandwidth.

### Decision
1. **Tier 1: Summary Metrics (`GET /snapshots/diff`)**:
   - Computes set aggregates in PostgreSQL using optimized `FULL OUTER JOIN` or `EXCEPT / UNION` queries.
   - Returns aggregated delta KPIs:
     ```json
     {
       "base_snapshot_id": "...",
       "target_snapshot_id": "...",
       "added_count": 2000,
       "removed_count": 100,
       "modified_annotations_count": 300,
       "split_movement_count": 50,
       "class_distribution_deltas": { "car": 150, "pedestrian": -20 }
     }
     ```
2. **Tier 2: Paginated Item-Level Delta (`GET /snapshots/diff/items`)**:
   - Filterable by `change_type` (`added`, `removed`, `modified`, `split_changed`).
   - Supports keyset/cursor pagination for frontend detail tabs.

---

## 7. Mutable Release Tags (Tagging Architecture)

### Context & Problem
User Story 5 requires tagging snapshots (e.g. `production`, `staging`, `baseline`). ML training and export pipelines need stable aliases that can be redirected to newer snapshots without changing configuration files or scripts.

### Decision
1. Create a `snapshot_tags` table:
   - `id`: ULID string (PK)
   - `project_id`: str (indexed)
   - `snapshot_id`: str (FK to `snapshots.id`, restricted to `READY` status)
   - `name`: str (e.g. `production`, `staging`)
   - `created_by`: int
   - `created_at`: datetime
   - `updated_at`: datetime
2. Constraint: `UNIQUE(project_id, name)`.
3. Creating or reassigning a tag atomically updates `snapshot_id` and `updated_at`.
4. Deleting a snapshot (`ARCHIVED` or purged) automatically cascades or cleans up attached tags.
