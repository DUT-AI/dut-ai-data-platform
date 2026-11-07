export type WorkItemStatus =
  | "CREATED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED";

export type WorkItemPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface WorkflowDefinition {
  id: string;
  project_id: string;
  name: string;
  description?: string | null;
  config: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WorkItem {
  id: string;
  workflow_id: string;
  project_id: string;
  resource_type: string;
  resource_id: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  metadata: Record<string, unknown>;
  assignee_id?: number | null;
  due_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Assignment {
  id: string;
  work_item_id: string;
  assignee_id: number;
  assigned_by: number;
  priority: WorkItemPriority;
  due_date?: string | null;
  is_active: boolean;
  assigned_at?: string | null;
}

export interface WorkflowHistory {
  id: string;
  work_item_id: string;
  from_state: WorkItemStatus;
  to_state: WorkItemStatus;
  changed_by: number;
  comment?: string | null;
  metadata: Record<string, unknown>;
  changed_at?: string | null;
}

export interface BatchItemSpec {
  batch_id: string;
  asset_ids: string[];
}

export interface CreateBatchWorkItemsRequest {
  workflow_id: string;
  project_id: string;
  resource_type?: string;
  batches: BatchItemSpec[];
  priority?: WorkItemPriority;
  dataset_id?: string;
  dataset_version_id?: string;
  dataset_name?: string;
  dataset_version_name?: string;
}

export interface BulkAssignRequest {
  work_item_ids: string[];
  assignee_ids: number[];
  due_date?: string | null;
  priority?: WorkItemPriority | null;
}

export interface TransitionWorkItemRequest {
  target_status: WorkItemStatus;
  comment?: string | null;
  metadata?: Record<string, unknown>;
}

export type AssetReviewStatus = "APPROVED" | "NEEDS_REVISION" | "FIXED";

export interface AssetReviewItem {
  status: AssetReviewStatus;
  comment?: string | null;
  asset_filename?: string | null;
  reviewed_at?: string | null;
  reviewer_id?: number | null;
  fixed_at?: string | null;
  fixed_by?: number | null;
}

export interface RecordAssetReviewRequest {
  asset_id: string;
  status: AssetReviewStatus;
  comment?: string | null;
  asset_filename?: string | null;
}

