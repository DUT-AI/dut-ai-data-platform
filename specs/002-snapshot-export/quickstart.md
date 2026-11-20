# Quickstart: Validating Snapshot-Driven Export

**Feature**: Snapshot-Driven Data Export  
**Branch**: `002-snapshot-export`  
**Date**: 2026-11-20  

---

## Prerequisites

1. Active Backend server running at `http://localhost:8000` with PostgreSQL and MinIO connected.
2. Authenticated user token with `Owner` or `Admin` role in the test project.
3. An existing project with a finalized **Snapshot** in status `READY`.
   *(If needed, create a snapshot via `POST /api/v1/projects/{project_id}/snapshots`)*

---

## Validation Scenario 1: Export Labels in YOLO Format

### 1. Trigger Export
Initiate an export request for an object detection snapshot:

```bash
curl -i -X POST "http://localhost:8000/api/v1/projects/{project_id}/snapshots/{snapshot_id}/exports" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "yolo",
    "target_output_id": "{bounding_box_output_id}",
    "media_mode": "labels_only",
    "annotated_only": false
  }'
```

**Expected Response**: `HTTP/1.1 202 Accepted`
```json
{
  "id": "01JEXPORT00000000000000001",
  "project_id": "01JPROJ0000000000000000001",
  "snapshot_id": "01JSNAP0000000000000000001",
  "format": "yolo",
  "status": "processing",
  "media_mode": "labels_only",
  "annotated_only": false,
  "item_count": 0,
  "created_by": 14,
  "created_at": "2026-11-20T11:50:00Z"
}
```

---

### 2. Poll for Status Completion
Poll the package endpoint until status becomes `ready`:

```bash
curl -X GET "http://localhost:8000/api/v1/projects/{project_id}/exports/{package_id}" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Outcome**:
```json
{
  "id": "01JEXPORT00000000000000001",
  "status": "ready",
  "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "file_size_bytes": 1048576,
  "item_count": 1500,
  "finalized_at": "2026-11-20T11:50:03Z"
}
```

---

### 3. Verify Idempotency
Execute the identical export request again:

```bash
curl -i -X POST "http://localhost:8000/api/v1/projects/{project_id}/snapshots/{snapshot_id}/exports" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "yolo",
    "target_output_id": "{bounding_box_output_id}",
    "media_mode": "labels_only",
    "annotated_only": false
  }'
```

**Expected Response**: `HTTP/1.1 200 OK` (returns the exact same `01JEXPORT00000000000000001` immediately without re-processing).

---

### 4. Download and Inspect Archive
Obtain the download link:

```bash
curl -X GET "http://localhost:8000/api/v1/projects/{project_id}/exports/{package_id}/download" \
  -H "Authorization: Bearer $TOKEN"
```

Download the ZIP archive and verify structure:
```bash
unzip -l package.zip
```
Expected output:
```text
Archive:  package.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
     1240  2026-11-20 11:50   manifest.json
      245  2026-11-20 11:50   data.yaml
       65  2026-11-20 11:50   labels/train/01ASSET01.txt
       82  2026-11-20 11:50   labels/train/01ASSET02.txt
       54  2026-11-20 11:50   labels/val/01ASSET03.txt
---------                     -------
```

Verify sha256 checksum matches database record:
```bash
sha256sum package.zip
```

---

## Validation Scenario 2: Scale Limit Guard in Full Bundle Mode

Attempt to export an oversized dataset (>2 GB or >5,000 files) with `media_mode="full_bundle"`:

```bash
curl -i -X POST "http://localhost:8000/api/v1/projects/{project_id}/snapshots/{oversized_snapshot_id}/exports" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "yolo",
    "media_mode": "full_bundle"
  }'
```

**Expected Response**: `HTTP/1.1 400 Bad Request`
```json
{
  "detail": "Full bundle export exceeds safe limit (6,200 media files > 5,000 limit). Please export in 'labels_only' mode."
}
```

---

## Validation Scenario 3: Delete Export Package

Delete the package to reclaim storage:

```bash
curl -i -X DELETE "http://localhost:8000/api/v1/projects/{project_id}/exports/{package_id}" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response**: `HTTP/1.1 204 No Content`. Subsequent download queries return `404 Not Found`, and the file on MinIO is purged.
