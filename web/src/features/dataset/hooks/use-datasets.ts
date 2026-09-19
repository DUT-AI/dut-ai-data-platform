"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { datasetApi } from "../api";
import {
  DatasetCreatePayload,
  DatasetUpdatePayload,
  DatasetVersionCreatePayload,
} from "../types";

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

export function useUpdateDatasetMutation(datasetId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DatasetUpdatePayload) =>
      datasetApi.updateDataset(datasetId, payload),
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

async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useDirectUploadVersionAssetsMutation(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      files,
      onProgress,
    }: {
      files: File[];
      onProgress?: (fileIndex: number, percent: number) => void;
    }) => {
      // Step 1: Prepare Upload Presigned URLs
      const preparePayload = {
        files: files.map((f) => ({
          filename: f.name,
          content_type: f.type || "application/octet-stream",
        })),
      };

      const prepareRes = await datasetApi.prepareAssetUpload(versionId, preparePayload);

      // Step 2: Upload Files directly to S3 and Compute SHA-256
      const finalizeItems = await Promise.all(
        files.map(async (file, index) => {
          const presigned = prepareRes.items[index];

          // Compute SHA-256 and upload to MinIO S3 concurrently
          const [sha256] = await Promise.all([
            computeSha256(file),
            datasetApi.uploadFileToS3(presigned.upload_url, file, (percent) => {
              onProgress?.(index, percent);
            }),
          ]);

          return {
            asset_id: presigned.asset_id,
            filename: file.name,
            storage_key: presigned.storage_key,
            sha256,
            file_size: file.size,
            mime_type: file.type || "application/octet-stream",
          };
        })
      );

      // Step 3: Finalize Import
      const finalizeRes = await datasetApi.finalizeAssetImport(versionId, {
        items: finalizeItems,
      });

      return {
        uploaded_assets: finalizeRes.imported_assets,
        new_assets_count: finalizeRes.imported_assets.length,
        reused_assets_count: 0,
      };
    },
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

export function useInheritDatasetVersionMutation(
  versionId: string,
  projectId?: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceVersionId: string) =>
      datasetApi.inheritDatasetVersion(versionId, sourceVersionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DATASET_KEYS.versionAssets(versionId),
      });
      queryClient.invalidateQueries({
        queryKey: DATASET_KEYS.versionDetail(versionId),
      });
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: DATASET_KEYS.projectLists(projectId),
        });
      }
    },
  });
}
