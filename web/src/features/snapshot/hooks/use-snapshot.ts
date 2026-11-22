import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { snapshotApi } from "../api/snapshot-api";
import type {
  SnapshotCreateRequest,
  SnapshotStatus,
} from "../types";

export function useSnapshotsQuery(
  projectId: string,
  status?: SnapshotStatus,
  options?: { limit?: number; offset?: number }
) {
  return useQuery({
    queryKey: ["snapshots", projectId, status, options?.limit, options?.offset],
    queryFn: () =>
      snapshotApi.listSnapshots(
        projectId,
        status,
        options?.limit,
        options?.offset
      ),
    enabled: Boolean(projectId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (Array.isArray(data) && data.some((s) => s.status === "CREATING")) {
        return 3000;
      }
      return false;
    },
  });
}

export function useSnapshotDetailQuery(
  projectId: string,
  snapshotId: string | null
) {
  return useQuery({
    queryKey: ["snapshot-detail", projectId, snapshotId],
    queryFn: () =>
      snapshotId ? snapshotApi.getSnapshotDetail(projectId, snapshotId) : null,
    enabled: Boolean(projectId && snapshotId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.status === "CREATING") {
        return 3000;
      }
      return false;
    },
  });
}

export function useSnapshotManifestQuery(
  projectId: string,
  snapshotId: string | null
) {
  return useQuery({
    queryKey: ["snapshot-manifest", projectId, snapshotId],
    queryFn: () =>
      snapshotId
        ? snapshotApi.getSnapshotManifest(projectId, snapshotId)
        : null,
    enabled: Boolean(projectId && snapshotId),
  });
}

export function useSnapshotItemsQuery(
  projectId: string,
  snapshotId: string | null,
  params?: {
    split?: string | null;
    cursor?: string | null;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: [
      "snapshot-items",
      projectId,
      snapshotId,
      params?.split,
      params?.cursor,
      params?.limit,
    ],
    queryFn: () =>
      snapshotId
        ? snapshotApi.listSnapshotItems(projectId, snapshotId, params)
        : null,
    enabled: Boolean(projectId && snapshotId),
  });
}

export function useSnapshotDiffSummaryQuery(
  projectId: string,
  baseId?: string | null,
  targetId?: string | null
) {
  return useQuery({
    queryKey: ["snapshot-diff-summary", projectId, baseId, targetId],
    queryFn: () =>
      baseId && targetId
        ? snapshotApi.getSnapshotDiffSummary(projectId, baseId, targetId)
        : null,
    enabled: Boolean(projectId && baseId && targetId && baseId !== targetId),
  });
}

export function useSnapshotDiffItemsQuery(
  projectId: string,
  params: {
    base_id?: string | null;
    target_id?: string | null;
    change_type?: string | null;
    cursor?: string | null;
    limit?: number;
  }
) {
  const { base_id, target_id, change_type, cursor, limit } = params;
  return useQuery({
    queryKey: [
      "snapshot-diff-items",
      projectId,
      base_id,
      target_id,
      change_type,
      cursor,
      limit,
    ],
    queryFn: () =>
      base_id && target_id && change_type
        ? snapshotApi.listSnapshotDiffItems(projectId, {
          base_id,
          target_id,
          change_type,
          cursor,
          limit,
        })
        : null,
    enabled: Boolean(projectId && base_id && target_id && change_type),
  });
}

export function useReleaseTagsQuery(projectId: string) {
  return useQuery({
    queryKey: ["release-tags", projectId],
    queryFn: () => snapshotApi.listReleaseTags(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateSnapshotMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SnapshotCreateRequest) =>
      snapshotApi.createSnapshot(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", projectId] });
    },
  });
}

export function useCancelSnapshotMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (snapshotId: string) =>
      snapshotApi.cancelSnapshot(projectId, snapshotId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", projectId] });
      queryClient.setQueryData(
        ["snapshot-detail", projectId, data.snapshot.id],
        data.snapshot
      );
    },
  });
}

export function useArchiveOrPurgeSnapshotMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      snapshotId,
      purge,
    }: {
      snapshotId: string;
      purge?: boolean;
    }) => snapshotApi.archiveOrPurgeSnapshot(projectId, snapshotId, purge),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", projectId] });
      queryClient.invalidateQueries({ queryKey: ["release-tags", projectId] });
    },
  });
}

export function useAssignReleaseTagMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ snapshotId, name }: { snapshotId: string; name: string }) =>
      snapshotApi.assignReleaseTag(projectId, snapshotId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", projectId] });
      queryClient.invalidateQueries({ queryKey: ["release-tags", projectId] });
    },
  });
}

export function useDeleteReleaseTagMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => snapshotApi.deleteReleaseTag(projectId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", projectId] });
      queryClient.invalidateQueries({ queryKey: ["release-tags", projectId] });
    },
  });
}
