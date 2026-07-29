import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { datasetApi } from "../api/dataset-api";
import {
  DatasetCreatePayload,
  DatasetVersionCreatePayload,
} from "../types/dataset";

export const DATASET_KEYS = {
  all: ["datasets"] as const,
  projectLists: (projectId: string) =>
    [...DATASET_KEYS.all, "project", projectId] as const,
  detail: (datasetId: string) =>
    [...DATASET_KEYS.all, "detail", datasetId] as const,
  versionDetail: (versionId: string) =>
    [...DATASET_KEYS.all, "version", versionId] as const,
  versionAssets: (versionId: string) =>
    [...DATASET_KEYS.all, "version-assets", versionId] as const,
  assetDownload: (assetId: string) =>
    [...DATASET_KEYS.all, "asset-download", assetId] as const,
};

export function useProjectDatasetsQuery(projectId: string) {
  return useQuery({
    queryKey: DATASET_KEYS.projectLists(projectId),
    queryFn: () => datasetApi.getProjectDatasets(projectId),
    enabled: Boolean(projectId),
  });
}

export function useDatasetDetailQuery(datasetId: string) {
  return useQuery({
    queryKey: DATASET_KEYS.detail(datasetId),
    queryFn: () => datasetApi.getDatasetDetail(datasetId),
    enabled: Boolean(datasetId),
  });
}

export function useDatasetVersionQuery(versionId: string) {
  return useQuery({
    queryKey: DATASET_KEYS.versionDetail(versionId),
    queryFn: () => datasetApi.getDatasetVersionDetail(versionId),
    enabled: Boolean(versionId),
  });
}

export function useVersionAssetsQuery(versionId: string) {
  return useQuery({
    queryKey: DATASET_KEYS.versionAssets(versionId),
    queryFn: () => datasetApi.listVersionAssets(versionId),
    enabled: Boolean(versionId),
  });
}

export function useCreateDatasetMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DatasetCreatePayload) =>
      datasetApi.createDataset(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DATASET_KEYS.projectLists(projectId),
      });
    },
  });
}

export function useCreateDatasetVersionMutation(
  datasetId: string,
  projectId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DatasetVersionCreatePayload) =>
      datasetApi.createDatasetVersion(datasetId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DATASET_KEYS.detail(datasetId),
      });
      queryClient.invalidateQueries({
        queryKey: DATASET_KEYS.projectLists(projectId),
      });
    },
  });
}

export function useUploadVersionAssetsMutation(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      datasetApi.uploadVersionAssets(versionId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DATASET_KEYS.versionAssets(versionId),
      });
      queryClient.invalidateQueries({
        queryKey: DATASET_KEYS.versionDetail(versionId),
      });
    },
  });
}

export function useRemoveVersionAssetMutation(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) =>
      datasetApi.removeVersionAsset(versionId, assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DATASET_KEYS.versionAssets(versionId),
      });
      queryClient.invalidateQueries({
        queryKey: DATASET_KEYS.versionDetail(versionId),
      });
    },
  });
}

export function usePublishDatasetVersionMutation(
  versionId: string,
  projectId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => datasetApi.publishDatasetVersion(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DATASET_KEYS.versionDetail(versionId),
      });
      queryClient.invalidateQueries({
        queryKey: DATASET_KEYS.projectLists(projectId),
      });
    },
  });
}

export function useAssetDownloadUrlQuery(assetId: string) {
  return useQuery({
    queryKey: DATASET_KEYS.assetDownload(assetId),
    queryFn: () => datasetApi.getAssetDownloadUrl(assetId),
    enabled: Boolean(assetId),
  });
}
