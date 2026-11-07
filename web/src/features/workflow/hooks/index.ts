import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workflowApi } from "../api";
import type {
  CreateBatchWorkItemsRequest,
  BulkAssignRequest,
  RecordAssetReviewRequest,
  TransitionWorkItemRequest,
  WorkItemStatus,
} from "../types";

export function useWorkItemsQuery(params: {
  project_id: string;
  workflow_id?: string;
  status?: WorkItemStatus;
  assignee_id?: number;
}) {
  return useQuery({
    queryKey: ["work-items", params],
    queryFn: () => workflowApi.listWorkItems(params),
    enabled: Boolean(params.project_id),
  });
}

export function useWorkItemDetailQuery(workItemId?: string | null) {
  return useQuery({
    queryKey: ["work-item-detail", workItemId],
    queryFn: () => (workItemId ? workflowApi.getWorkItem(workItemId) : null),
    enabled: Boolean(workItemId),
  });
}

export function useWorkItemHistoryQuery(workItemId: string | null) {
  return useQuery({
    queryKey: ["work-item-history", workItemId],
    queryFn: () => (workItemId ? workflowApi.getHistory(workItemId) : []),
    enabled: Boolean(workItemId),
  });
}

export function useProjectWorkflowQuery(projectId: string) {
  return useQuery({
    queryKey: ["project-workflow", projectId],
    queryFn: () => workflowApi.getProjectWorkflow(projectId),
    enabled: Boolean(projectId),
    retry: false,
  });
}

export function useCreateWorkflowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workflowApi.createDefinition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}

export function useCreateBatchesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBatchWorkItemsRequest) => workflowApi.createBatches(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["work-items", { project_id: variables.project_id }],
      });
    },
  });
}

export function useBulkAssignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkAssignRequest) => workflowApi.bulkAssign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
    },
  });
}

export function useTransitionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workItemId,
      data,
    }: {
      workItemId: string;
      data: TransitionWorkItemRequest;
    }) => workflowApi.transition(workItemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      queryClient.invalidateQueries({
        queryKey: ["work-item-history", variables.workItemId],
      });
      queryClient.invalidateQueries({
        queryKey: ["work-item-detail", variables.workItemId],
      });
    },
  });
}

export function useAddWorkItemCommentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workItemId,
      data,
    }: {
      workItemId: string;
      data: { comment: string; metadata?: Record<string, unknown> };
    }) => workflowApi.addComment(workItemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["work-item-history", variables.workItemId],
      });
    },
  });
}

export function useRecordAssetReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workItemId,
      data,
    }: {
      workItemId: string;
      data: RecordAssetReviewRequest;
    }) => workflowApi.recordAssetReview(workItemId, data),
    onSuccess: (updatedWorkItem) => {
      queryClient.setQueryData(["work-item-detail", updatedWorkItem.id], updatedWorkItem);
      queryClient.invalidateQueries({ queryKey: ["work-item-detail", updatedWorkItem.id] });
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
    },
  });
}

