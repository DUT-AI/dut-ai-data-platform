# UI Contract: Real Dataset Batch Creation & Work Item Distribution

**Feature**: `002-workflow-domain` | **Date**: 2026-11-05

## 1. Batch Creation Component Contract (`CreateBatchModal`)

### Component Props
```typescript
interface CreateBatchModalProps {
  projectId: string;
  workflowId: string;
  onClose: () => void;
  onSuccess: () => void;
}
```

### Data Fetching Integration
1. **Dataset Listing**:
   - Query: `useProjectDatasetsQuery(projectId)`
   - Endpoint: `GET /api/v1/projects/{project_id}/datasets`
   - Returns: `Dataset[]` with nested `versions: DatasetVersion[]`.
2. **Version Asset Listing**:
   - Query: `useVersionAssetsQuery(selectedVersionId)`
   - Endpoint: `GET /api/v1/dataset-versions/{version_id}/assets?limit=500`
   - Returns: `Asset[]` with actual database UUIDs (`id`), filenames, and metadata.

### Component Form State & Schema
```typescript
interface CreateBatchFormState {
  datasetId: string;
  versionId: string;
  batchPrefix: string;
  batchSize: number;
}
```

### Partitioning & Batch Payload Construction
```typescript
function partitionAssetsIntoBatches(
  assets: Asset[],
  batchPrefix: string,
  batchSize: number
): BatchItemSpec[] {
  const numBatches = Math.ceil(assets.length / batchSize);
  const batches: BatchItemSpec[] = [];
  
  for (let i = 0; i < numBatches; i++) {
    const chunk = assets.slice(i * batchSize, (i + 1) * batchSize);
    batches.push({
      batch_id: `${batchPrefix}_${(i + 1).toString().padStart(2, "0")}`,
      asset_ids: chunk.map((asset) => asset.id),
    });
  }
  
  return batches;
}
```

### Submission Request Payload
```typescript
interface CreateBatchWorkItemsPayload {
  workflow_id: string;
  project_id: string;
  resource_type: "ANNOTATION_BATCH";
  dataset_id?: string;
  dataset_version_id?: string;
  batches: Array<{
    batch_id: string;
    asset_ids: string[]; // Actual database UUIDs of assets
  }>;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}
```

