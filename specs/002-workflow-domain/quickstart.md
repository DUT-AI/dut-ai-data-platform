# Quickstart & Verification Guide: Workflow Domain

**Feature**: `002-workflow-domain` | **Date**: 2026-11-04

## 1. Running Automated Tests

Run unit and integration tests specifically targeting the workflow module:

```bash
# Run pure domain & transition engine unit tests (fast, in-memory)
pytest tests/modules/workflow/unit -v

# Run workflow repository and API integration tests
pytest tests/modules/workflow/integration -v
```

## 2. API Usage Scenario Walkthrough

### Step 1: Create a Workflow Definition
```bash
curl -X POST http://localhost:8000/api/v1/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "project_id": "01JM6T3V8A4X9Q2Z1B5E7K9W3D",
    "name": "Image Classification Workflow",
    "description": "Standard label and review workflow"
  }'
```

### Step 2: Initialize Batched Work Items from Dataset
```bash
# Example creating batches from real dataset assets
curl -X POST http://localhost:8000/api/v1/work-items/batches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "workflow_id": "01JM6T4A...",
    "project_id": "01JM6T3V8A4X9Q2Z1B5E7K9W3D",
    "resource_type": "ANNOTATION_BATCH",
    "dataset_id": "01JM6T3V8A4X9Q2Z1B5E7K9W3E",
    "dataset_version_id": "01JM6T3V8A4X9Q2Z1B5E7K9W3F",
    "batches": [
      {
        "batch_id": "batch_01",
        "asset_ids": ["01JM8A1...", "01JM8A2...", "01JM8A3..."]
      },
      {
        "batch_id": "batch_02",
        "asset_ids": ["01JM8A4...", "01JM8A5..."]
      }
    ]
  }'
```

### Step 3: Bulk Assign Work Items Across Annotators
```bash
curl -X POST http://localhost:8000/api/v1/work-items/bulk-assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "work_item_ids": ["item_001", "item_002"],
    "assignee_ids": [101, 102],
    "due_date": "2026-11-10T00:00:00Z"
  }'
```

### Step 4: Worker Starts and Submits Task
```bash
# Worker 101 moves batch to IN_PROGRESS
curl -X POST http://localhost:8000/api/v1/work-items/item_001/transition \
  -H "Content-Type: application/json" \
  -d '{"target_status": "IN_PROGRESS"}'

# Worker 101 submits work
curl -X POST http://localhost:8000/api/v1/work-items/item_001/transition \
  -H "Content-Type: application/json" \
  -d '{"target_status": "SUBMITTED"}'
```

### Step 5: Reviewer Reviews (Approve or Reject with Comment)
```bash
# Reviewer approves
curl -X POST http://localhost:8000/api/v1/work-items/item_001/transition \
  -H "Content-Type: application/json" \
  -d '{
    "target_status": "APPROVED",
    "comment": "Accurate bounding boxes. Well done."
  }'
```

### Step 6: Query Audit Trail
```bash
curl -X GET http://localhost:8000/api/v1/work-items/item_001/history
```
Response contains the chronological list of all state changes, actors, timestamps, and feedback comments.

