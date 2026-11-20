# Quickstart Validation Guide: Snapshot Domain

**Feature Branch**: `004-snapshot-domain`  
**Date**: 2026-11-19  
**Status**: Final  

---

This guide defines the end-to-end validation flows for the Snapshot Domain & Immutable Dataset Publishing feature, proving all functional requirements and success criteria.

## Prerequisites

1. Active Python environment with backend dependencies:
   ```bash
   uv sync
   ```
2. PostgreSQL and MinIO services running:
   ```bash
   docker compose up -d postgres minio
   ```
3. A seeded project containing at least:
   - One published Dataset Version with 10+ assets (images/tabular).
   - One published Ontology Version belonging to the same project.
   - At least 8 assets with approved annotations matching the ontology version.

---

## Scenario 1: Create Snapshot with Multilabel Iterative Stratification (P1)

**Goal**: Verify that requesting a snapshot creates an immutable dataset release with balanced class distribution and deterministic checksums.

### Steps
1. Send asynchronous snapshot creation request:
   ```bash
   curl -X POST http://localhost:8000/api/v1/projects/{project_id}/snapshots \
     -H "Content-Type: application/json" \
     -H "X-User-Id: 1001" \
     -d '{
       "dataset_version_id": "'"$DATASET_VERSION_ID"'",
       "ontology_version_id": "'"$ONTOLOGY_VERSION_ID"'",
       "version_name": "v1.0.0",
       "selection_policy": "LATEST_APPROVED",
       "split_strategy": "STRATIFIED",
       "split_ratios": {"train": 0.70, "validation": 0.15, "test": 0.15},
       "split_seed": 42
     }'
   ```
2. Verify response status is `202 Accepted` returning a snapshot in `CREATING` status.
3. Poll snapshot status until `READY`:
   ```bash
   curl http://localhost:8000/api/v1/projects/{project_id}/snapshots/{snapshot_id} \
     -H "X-User-Id: 1001"
   ```

### Expected Outcome
- Status transitions to `READY` within 30 seconds (SC-002).
- Class distribution in `train`, `validation`, and `test` splits deviates by no more than 2% from the overall dataset class distribution (SC-004).
- Total items match the source dataset version assets.

---

## Scenario 2: Verify Snapshot Immutability & Referential Guard (P1)

**Goal**: Prove that once finalized, neither snapshot items nor upstream referenced data can be altered or hard-deleted.

### Steps
1. Attempt to mutate snapshot items directly:
   - Operation must be blocked with `InvariantViolationError` (`snapshot_immutable`).
2. Attempt to hard-delete an asset or annotation revision in upstream domain that is pinned by this snapshot:
   - Upstream domain raises referential guard error (`cannot delete asset referenced by active snapshot`).
3. Soft-delete an asset upstream:
   - Fetching snapshot items still returns the asset and valid checksum (proves isolation).

### Expected Outcome
- 100% of finalized snapshots are strictly immutable (SC-001).
- Upstream assets remain intact and queryable by the snapshot.

---

## Scenario 3: Verify Deterministic Checksum & Audit Manifest (P1)

**Goal**: Confirm that item checksums and aggregate manifest digests are bit-for-bit reproducible.

### Steps
1. Fetch snapshot manifest:
   ```bash
   curl http://localhost:8000/api/v1/projects/{project_id}/snapshots/{snapshot_id}/manifest \
     -H "X-User-Id: 1001"
   ```
2. Verify manifest is persisted on MinIO/S3 at the reported `storage_uri`.
3. Fetch all snapshot items via keyset pagination:
   ```bash
   curl "http://localhost:8000/api/v1/projects/{project_id}/snapshots/{snapshot_id}/items?limit=1000" \
     -H "X-User-Id: 1001"
   ```
4. Re-calculate SHA-256 for each item from its canonical JSON fields (`asset_id`, `asset_checksum`, `annotation_revision_id`, `split`) and aggregate digest over the lexicographically sorted checksum list.

### Expected Outcome
- 100% of recomputed item checksums match database records exactly.
- Recomputed aggregate digest matches the manifest `aggregate_checksum` exactly (SC-005).

---

## Scenario 4: Snapshot Comparison & Two-Tier Diff Service (P2)

**Goal**: Verify that comparing two snapshots produces immediate KPI metric summaries and paginated item deltas.

### Steps
1. Create a second snapshot `v1.1.0` with 2 added assets, 1 updated annotation revision, and 1 split change.
2. Request summary diff:
   ```bash
   curl "http://localhost:8000/api/v1/projects/{project_id}/snapshots/diff?base_id={snapshot_v1_id}&target_id={snapshot_v2_id}" \
     -H "X-User-Id: 1001"
   ```
3. Request granular modified items:
   ```bash
   curl "http://localhost:8000/api/v1/projects/{project_id}/snapshots/diff/items?base_id={snapshot_v1_id}&target_id={snapshot_v2_id}&change_type=modified" \
     -H "X-User-Id: 1001"
   ```

### Expected Outcome
- Summary response returns in under 3 seconds (SC-006) with `added_asset_count: 2`, `modified_annotation_count: 1`, `split_movement_count: 1`.
- Granular endpoint returns exact item IDs.

---

## Scenario 5: Mutable Release Tagging & Lifecycle Archiving (P3)

**Goal**: Test mutable alias tag reassignment, soft-delete archiving, and Owner-only purge permissions.

### Steps
1. Assign tag `production` to Snapshot v1:
   ```bash
   curl -X POST http://localhost:8000/api/v1/projects/{project_id}/snapshots/{snapshot_v1_id}/tags \
     -H "Content-Type: application/json" \
     -H "X-User-Id: 1001" \
     -d '{"name": "production"}'
   ```
2. Reassign tag `production` to Snapshot v2:
   ```bash
   curl -X POST http://localhost:8000/api/v1/projects/{project_id}/snapshots/{snapshot_v2_id}/tags \
     -H "Content-Type: application/json" \
     -H "X-User-Id: 1001" \
     -d '{"name": "production"}'
   ```
3. Verify project tags: tag `production` now points to Snapshot v2.
4. Soft-delete Snapshot v1:
   ```bash
   curl -X DELETE http://localhost:8000/api/v1/projects/{project_id}/snapshots/{snapshot_v1_id} \
     -H "X-User-Id: 1001"
   ```
   - Status becomes `ARCHIVED`. Items and manifest remain intact.
5. Attempt hard purge as non-Owner:
   - Fails with `403 Forbidden`.
6. Hard purge as Project Owner:
   ```bash
   curl -X DELETE http://localhost:8000/api/v1/projects/{project_id}/snapshots/{snapshot_v1_id}/purge \
     -H "X-User-Id: 999"  # Project Owner ID
   ```
   - Records and S3 manifest files are permanently removed.

---

## Automated Test Command

To run the automated test suite for Snapshot Domain:

```bash
uv run pytest tests/modules/snapshot/ -v
```
