import type { ApiQueryOf, Schema } from "@/types/api";

// ---- API contract: generated from backend DTOs ----
export type WorkItemStatus = Schema<"WorkItemStatus">;
export type WorkItemPriority = Schema<"WorkItemPriority">;

export type WorkflowDefinition = Schema<"WorkflowDefinitionResponse">;
export type WorkItem = Schema<"WorkItemResponse">;
export type Assignment = Schema<"AssignmentResponse">;
export type WorkflowHistory = Schema<"WorkflowHistoryResponse">;

export type CreateWorkflowDefinitionRequest =
  Schema<"CreateWorkflowDefinitionRequest">;
export type BatchItemSpec = Schema<"BatchItemSpec">;
export type CreateBatchWorkItemsRequest = Schema<"CreateBatchWorkItemsRequest">;
export type BulkAssignRequest = Schema<"BulkAssignRequest">;
export type TransitionWorkItemRequest = Schema<"TransitionWorkItemRequest">;
export type AddWorkItemCommentRequest = Schema<"AddWorkItemCommentRequest">;
export type RecordAssetReviewRequest = Schema<"RecordAssetReviewRequest">;
export type AssetReviewStatus = RecordAssetReviewRequest["status"];
export type WorkItemListQuery = ApiQueryOf<"/api/v1/work-items">;

/**
 * FE view of one entry of `WorkItem.metadata.asset_reviews[assetId]`.
 * `metadata` is free-form JSON in the backend; the asset-review route writes
 * these keys (modules/workflow/presentation/api/routes.py).
 */
export interface AssetReviewItem {
  status: AssetReviewStatus;
  comment?: string | null;
  asset_filename?: string | null;
  reviewed_at?: string | null;
  reviewer_id?: number | null;
  fixed_at?: string | null;
  fixed_by?: number | null;
}
