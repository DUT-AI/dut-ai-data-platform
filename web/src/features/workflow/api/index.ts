import { api } from "@/lib/api";
import type {
  AddWorkItemCommentRequest,
  Assignment,
  BulkAssignRequest,
  CreateBatchWorkItemsRequest,
  CreateWorkflowDefinitionRequest,
  RecordAssetReviewRequest,
  TransitionWorkItemRequest,
  WorkflowDefinition,
  WorkflowHistory,
  WorkItem,
  WorkItemListQuery,
} from "../types";

export const workflowApi = {
  createDefinition: async (
    data: CreateWorkflowDefinitionRequest
  ): Promise<WorkflowDefinition> => {
    const res = await api.post<WorkflowDefinition>("/workflows", data);
    return res.data;
  },

  getDefinition: async (id: string): Promise<WorkflowDefinition> => {
    const res = await api.get<WorkflowDefinition>(`/workflows/${id}`);
    return res.data;
  },

  getProjectWorkflow: async (
    projectId: string
  ): Promise<WorkflowDefinition> => {
    const res = await api.get<WorkflowDefinition>(
      `/projects/${projectId}/workflow`
    );
    return res.data;
  },

  listWorkItems: async (params: WorkItemListQuery): Promise<WorkItem[]> => {
    const res = await api.get<WorkItem[]>("/work-items", { params });
    return res.data;
  },

  getWorkItem: async (id: string): Promise<WorkItem> => {
    const res = await api.get<WorkItem>(`/work-items/${id}`);
    return res.data;
  },

  createBatches: async (
    data: CreateBatchWorkItemsRequest
  ): Promise<WorkItem[]> => {
    const res = await api.post<WorkItem[]>("/work-items/batches", data);
    return res.data;
  },

  bulkAssign: async (data: BulkAssignRequest): Promise<Assignment[]> => {
    const res = await api.post<Assignment[]>("/work-items/bulk-assign", data);
    return res.data;
  },

  transition: async (
    workItemId: string,
    data: TransitionWorkItemRequest
  ): Promise<WorkItem> => {
    const res = await api.post<WorkItem>(
      `/work-items/${workItemId}/transition`,
      data
    );
    return res.data;
  },

  getHistory: async (workItemId: string): Promise<WorkflowHistory[]> => {
    const res = await api.get<WorkflowHistory[]>(
      `/work-items/${workItemId}/history`
    );
    return res.data;
  },

  addComment: async (
    workItemId: string,
    data: AddWorkItemCommentRequest
  ): Promise<WorkflowHistory> => {
    const res = await api.post<WorkflowHistory>(
      `/work-items/${workItemId}/comments`,
      data
    );
    return res.data;
  },

  recordAssetReview: async (
    workItemId: string,
    data: RecordAssetReviewRequest
  ): Promise<WorkItem> => {
    const res = await api.post<WorkItem>(
      `/work-items/${workItemId}/asset-reviews`,
      data
    );
    return res.data;
  },
};
