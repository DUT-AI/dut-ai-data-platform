import { api } from "@/lib/api";
import type {
  ReleaseTagResponse,
  SnapshotCancelResponse,
  SnapshotCreateRequest,
  SnapshotDiffItemsResponse,
  SnapshotDiffSummaryResponse,
  SnapshotItemListResponse,
  SnapshotManifestResponse,
  SnapshotResponse,
  SnapshotStatus,
} from "../types";

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const res = (err as { response?: { data?: { detail?: string } } }).response;
    if (res?.data?.detail) return String(res.data.detail);
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export const snapshotApi = {
  listSnapshots: async (
    projectId: string,
    status?: SnapshotStatus,
    limit = 50,
    offset = 0
  ): Promise<SnapshotResponse[]> => {
    const params: Record<string, string | number> = { limit, offset };
    if (status) {
      params.status = status;
    }
    const response = await api.get<SnapshotResponse[]>(
      `/projects/${projectId}/snapshots`,
      { params }
    );
    return response.data;
  },

  getSnapshotDetail: async (
    projectId: string,
    snapshotId: string
  ): Promise<SnapshotResponse> => {
    const response = await api.get<SnapshotResponse>(
      `/projects/${projectId}/snapshots/${snapshotId}`
    );
    return response.data;
  },

  createSnapshot: async (
    projectId: string,
    payload: SnapshotCreateRequest
  ): Promise<SnapshotResponse> => {
    const response = await api.post<SnapshotResponse>(
      `/projects/${projectId}/snapshots`,
      payload
    );
    return response.data;
  },

  cancelSnapshot: async (
    projectId: string,
    snapshotId: string
  ): Promise<SnapshotCancelResponse> => {
    const response = await api.post<SnapshotCancelResponse>(
      `/projects/${projectId}/snapshots/${snapshotId}/cancel`
    );
    return response.data;
  },

  archiveOrPurgeSnapshot: async (
    projectId: string,
    snapshotId: string,
    purge = false
  ): Promise<{ message?: string; snapshot?: SnapshotResponse }> => {
    const response = await api.delete(
      `/projects/${projectId}/snapshots/${snapshotId}`,
      { params: { purge } }
    );
    return response.data;
  },

  getSnapshotManifest: async (
    projectId: string,
    snapshotId: string
  ): Promise<SnapshotManifestResponse> => {
    const response = await api.get<SnapshotManifestResponse>(
      `/projects/${projectId}/snapshots/${snapshotId}/manifest`
    );
    return response.data;
  },

  listSnapshotItems: async (
    projectId: string,
    snapshotId: string,
    params?: { cursor?: string | null; limit?: number; split?: string | null }
  ): Promise<SnapshotItemListResponse> => {
    const response = await api.get<SnapshotItemListResponse>(
      `/projects/${projectId}/snapshots/${snapshotId}/items`,
      { params }
    );
    return response.data;
  },

  getSnapshotDiffSummary: async (
    projectId: string,
    baseId: string,
    targetId: string
  ): Promise<SnapshotDiffSummaryResponse> => {
    const response = await api.get<SnapshotDiffSummaryResponse>(
      `/projects/${projectId}/snapshots/diff`,
      {
        params: {
          base_id: baseId,
          target_id: targetId,
        },
      }
    );
    return response.data;
  },

  listSnapshotDiffItems: async (
    projectId: string,
    params: {
      base_id: string;
      target_id: string;
      change_type: string;
      cursor?: string | null;
      limit?: number;
    }
  ): Promise<SnapshotDiffItemsResponse> => {
    const response = await api.get<SnapshotDiffItemsResponse>(
      `/projects/${projectId}/snapshots/diff/items`,
      { params }
    );
    return response.data;
  },

  listReleaseTags: async (projectId: string): Promise<ReleaseTagResponse[]> => {
    const response = await api.get<ReleaseTagResponse[]>(
      `/projects/${projectId}/tags`
    );
    return response.data;
  },

  assignReleaseTag: async (
    projectId: string,
    snapshotId: string,
    name: string
  ): Promise<ReleaseTagResponse> => {
    const response = await api.post<ReleaseTagResponse>(
      `/projects/${projectId}/snapshots/${snapshotId}/tags`,
      { name }
    );
    return response.data;
  },

  deleteReleaseTag: async (projectId: string, name: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/tags/${name}`);
  },
};
