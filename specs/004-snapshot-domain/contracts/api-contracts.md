# API Contracts: Snapshot Domain

**Feature Branch**: `004-snapshot-domain`  
**Date**: 2026-11-19  
**Status**: Final  

---

## 1. Endpoints Overview

All endpoints are mounted under `/api/v1/projects/{project_id}`.

| Method | Path | Summary | Auth Role | Status Codes |
|---|---|---|---|---|
| `POST` | `/snapshots` | Asynchronously initiate snapshot creation | Project Owner, Admin, ML Engineer | `202`, `400`, `404`, `409` |
| `GET` | `/snapshots` | List project snapshots | Project Member+ | `200` |
| `GET` | `/snapshots/{snapshot_id}` | Get snapshot details & status | Project Member+ | `200`, `404` |
| `DELETE` | `/snapshots/{snapshot_id}` | Soft-delete snapshot (`ARCHIVED`) | Project Owner, Admin | `200`, `404`, `409` |
| `DELETE` | `/snapshots/{snapshot_id}/purge`| Hard-delete snapshot & manifests | Project Owner ONLY | `204`, `403`, `404`, `409` |
| `POST` | `/snapshots/{snapshot_id}/cancel` | Cancel `CREATING` snapshot job | Creator, Project Admin, Owner | `200`, `400`, `404` |
| `GET` | `/snapshots/{snapshot_id}/items` | List snapshot items (Keyset/Offset) | Project Member+ | `200`, `404` |
| `GET` | `/snapshots/{snapshot_id}/manifest`| Get manifest metadata & S3 URI | Project Member+ | `200`, `404`, `409` |
| `GET` | `/snapshots/diff` | Two-snapshot KPI summary comparison | Project Member+ | `200`, `400`, `404` |
| `GET` | `/snapshots/diff/items` | Granular item-level diff details | Project Member+ | `200`, `400`, `404` |
| `POST` | `/snapshots/{snapshot_id}/tags` | Assign or reassign release tag | Project Owner, Admin | `200`, `400`, `404` |
| `GET` | `/tags` | List all release tags in project | Project Member+ | `200` |
| `DELETE` | `/tags/{tag_name}` | Remove a release tag | Project Owner, Admin | `204`, `404` |

---

## 2. Request & Response Schemas

### 2.1 Initiate Snapshot Creation
`POST /api/v1/projects/{project_id}/snapshots`

**Request Body**:
```json
{
  "dataset_version_id": "01JABCDEF12345678901234567",
  "ontology_version_id": "01JBCDEF012345678901234567",
  "version_name": "v1.0.0",
  "selection_policy": "LATEST_APPROVED",
  "include_unannotated": false,
  "split_strategy": "STRATIFIED",
  "split_ratios": {
    "train": 0.70,
    "validation": 0.15,
    "test": 0.15
  },
  "split_seed": 42
}
```

*Notes*: `version_name` is optional (auto-generated `v1`, `v2`, ... if omitted). `selection_policy` defaults to `LATEST_APPROVED`. `split_ratios` must sum to 1.0.

**Response** (`202 Accepted`):
```json
{
  "id": "01JXYZ98765432101234567890",
  "project_id": "01JPROJ123456789012345678",
  "dataset_version_id": "01JABCDEF12345678901234567",
  "ontology_version_id": "01JBCDEF012345678901234567",
  "version_name": "v1.0.0",
  "status": "CREATING",
  "selection_policy": "LATEST_APPROVED",
  "include_unannotated": false,
  "split_strategy": "STRATIFIED",
  "split_ratios": {
    "train": 0.70,
    "validation": 0.15,
    "test": 0.15
  },
  "split_seed": 42,
  "created_by": 1001,
  "created_at": "2026-11-19T09:30:00Z"
}
```

---

### 2.2 Get Snapshot Details
`GET /api/v1/projects/{project_id}/snapshots/{snapshot_id}`

**Response** (`200 OK`):
```json
{
  "id": "01JXYZ98765432101234567890",
  "project_id": "01JPROJ123456789012345678",
  "dataset_version_id": "01JABCDEF12345678901234567",
  "ontology_version_id": "01JBCDEF012345678901234567",
  "version_name": "v1.0.0",
  "status": "READY",
  "selection_policy": "LATEST_APPROVED",
  "include_unannotated": false,
  "split_strategy": "STRATIFIED",
  "split_ratios": {
    "train": 0.70,
    "validation": 0.15,
    "test": 0.15
  },
  "split_seed": 42,
  "tags": ["production"],
  "error_code": null,
  "error_message": null,
  "created_by": 1001,
  "created_at": "2026-11-19T09:30:00Z",
  "finalized_at": "2026-11-19T09:30:25Z",
  "archived_at": null
}
```

---

### 2.3 List Snapshot Items (Keyset / Offset Pagination)
`GET /api/v1/projects/{project_id}/snapshots/{snapshot_id}/items?cursor=01JXYZ...&limit=100&split=train`

**Query Parameters**:
- `cursor` (string, optional): ULID of last item for Keyset seek.
- `limit` (int, default: 100, max: 1000).
- `split` (string, optional): `train`, `validation`, `test`.
- `page` / `page_size` (optional, for interactive UI views).

**Response** (`200 OK`):
```json
{
  "items": [
    {
      "id": "01JITEM000000000000000001",
      "snapshot_id": "01JXYZ98765432101234567890",
      "asset_id": "01JASSET12345678901234567",
      "annotation_revision_id": "01JREVISION12345678901234",
      "split": "train",
      "item_checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "sort_order": 0
    }
  ],
  "next_cursor": "01JITEM000000000000000100",
  "total_count": 10000
}
```

---

### 2.4 Snapshot Manifest
`GET /api/v1/projects/{project_id}/snapshots/{snapshot_id}/manifest`

**Response** (`200 OK`):
```json
{
  "snapshot_id": "01JXYZ98765432101234567890",
  "dataset_version_id": "01JABCDEF12345678901234567",
  "ontology_version_id": "01JBCDEF012345678901234567",
  "asset_count": 10000,
  "annotation_count": 14250,
  "split_distribution": {
    "train": { "count": 7000, "ratio": 0.70 },
    "validation": { "count": 1500, "ratio": 0.15 },
    "test": { "count": 1500, "ratio": 0.15 }
  },
  "class_distribution": {
    "train": { "car": 4900, "pedestrian": 2100 },
    "validation": { "car": 1050, "pedestrian": 450 },
    "test": { "car": 1050, "pedestrian": 450 }
  },
  "aggregate_checksum": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  "storage_uri": "s3://dut-ai-platform/projects/01JPROJ/snapshots/01JXYZ/manifest.json",
  "created_at": "2026-11-19T09:30:25Z"
}
```

---

### 2.5 Snapshot Diff (Summary & Item Detail)

#### Summary: `GET /api/v1/projects/{project_id}/snapshots/diff?base_id={idA}&target_id={idB}`
**Response** (`200 OK`):
```json
{
  "base_snapshot_id": "01JBASE0000000000000000001",
  "target_snapshot_id": "01JTARGET00000000000000001",
  "added_asset_count": 2000,
  "removed_asset_count": 100,
  "modified_annotation_count": 300,
  "split_movement_count": 50,
  "class_distribution_deltas": {
    "car": 1200,
    "pedestrian": -50,
    "cyclist": 400
  }
}
```

#### Item Detail: `GET /api/v1/projects/{project_id}/snapshots/diff/items?base_id={idA}&target_id={idB}&change_type=modified&cursor=...&limit=50`
**Response** (`200 OK`):
```json
{
  "items": [
    {
      "asset_id": "01JASSET12345678901234567",
      "change_type": "modified",
      "base_revision_id": "01JREV1",
      "target_revision_id": "01JREV2",
      "base_split": "train",
      "target_split": "train"
    }
  ],
  "next_cursor": "01JASSET12345678901234599"
}
```

---

### 2.6 Release Tagging
`POST /api/v1/projects/{project_id}/snapshots/{snapshot_id}/tags`

**Request Body**:
```json
{
  "name": "production"
}
```

**Response** (`200 OK`):
```json
{
  "name": "production",
  "snapshot_id": "01JXYZ98765432101234567890",
  "project_id": "01JPROJ123456789012345678",
  "created_by": 1001,
  "updated_at": "2026-11-19T09:35:00Z"
}
```

---

## 3. Standardized Error Codes

Translation to HTTP status codes belongs strictly to presentation-layer exception handlers (Constitution Principle I).

| Error Code | HTTP Status | Description |
|---|---|---|
| `dataset_version_empty` | `400 Bad Request` | Dataset version contains 0 assets. |
| `invalid_split_ratios` | `400 Bad Request` | Split ratios do not sum to 1.0 or contain negative values. |
| `ontology_incompatibility` | `400 Bad Request` | Annotation revisions violate ontology constraints. |
| `snapshot_not_ready` | `400 Bad Request` | Attempted operation (e.g. tagging, downstream read) on non-READY snapshot. |
| `snapshot_immutable` | `400 Bad Request` | Modification attempted on finalized/archived snapshot. |
| `active_dependency_conflict`| `409 Conflict` | Deletion/archival blocked because snapshot is used in active export/training job. |
| `snapshot_version_already_exists` | `409 Conflict` | `version_name` already exists within this project. |
| `tag_not_found` | `404 Not Found` | Specified release tag name does not exist. |
| `snapshot_not_found` | `404 Not Found` | Specified snapshot ID does not exist in project. |
| `cancelled_by_user` | `200 / Recorded in FAILED` | Snapshot creation gracefully aborted by user request. |
| `creation_timeout` | `Recorded in FAILED` | Background worker exceeded 60-minute hard ceiling. |
