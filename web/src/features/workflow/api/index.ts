import { api } from "@/lib/api";
import type {
  Assignment,
  CreateBatchWorkItemsRequest,
  BulkAssignRequest,
  RecordAssetReviewRequest,
  TransitionWorkItemRequest,
  WorkflowDefinition,
  WorkflowHistory,
  WorkItem,
  WorkItemStatus,
} from "../types";

export const workflowApi = {
  createDefinition: async (data: {
    project_id: string;
    name: string;
    description?: string;
    config?: Record<string, unknown>;
  }): Promise<WorkflowDefinition> => {
    const res = await api.post("/workflows", data);
    return res.data;
  },

  getDefinition: async (id: string): Promise<WorkflowDefinition> => {
    const res = await api.get(`/workflows/${id}`);
    return res.data;
  },

  getProjectWorkflow: async (projectId: string): Promise<WorkflowDefinition> => {
    const res = await api.get(`/projects/${projectId}/workflow`);
    return res.data;
  },

  listWorkItems: async (params: {
    project_id: string;
    workflow_id?: string;
    status?: WorkItemStatus;
    assignee_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<WorkItem[]> => {
    const res = await api.get("/work-items", { params });
    return res.data;
  },

  getWorkItem: async (id: string): Promise<WorkItem> => {
    const res = await api.get(`/work-items/${id}`);
    return res.data;
  },

  createBatches: async (data: CreateBatchWorkItemsRequest): Promise<WorkItem[]> => {
    const res = await api.post("/work-items/batches", data);
    return res.data;
  },

  bulkAssign: async (data: BulkAssignRequest): Promise<Assignment[]> => {
    const res = await api.post("/work-items/bulk-assign", data);
    return res.data;
  },

  transition: async (
    workItemId: string,
    data: TransitionWorkItemRequest
  ): Promise<WorkItem> => {
    const res = await api.post(`/work-items/${workItemId}/transition`, data);
    return res.data;
  },

  getHistory: async (workItemId: string): Promise<WorkflowHistory[]> => {
    const res = await api.get(`/work-items/${workItemId}/history`);
    return res.data;
  },

  addComment: async (
    workItemId: string,
    data: { comment: string; metadata?: Record<string, unknown> }
  ): Promise<WorkflowHistory> => {
    const res = await api.post(`/work-items/${workItemId}/comments`, data);
    return res.data;
  },

  recordAssetReview: async (
    workItemId: string,
    data: RecordAssetReviewRequest
  ): Promise<WorkItem> => {
    const res = await api.post(`/work-items/${workItemId}/asset-reviews`, data);
    return res.data;
  },
};

