import { api } from "@/lib/api";
import {
  Asset,
  AssetDownloadUrlResponse,
  BatchUploadResult,
  Dataset,
  DatasetCreatePayload,
  DatasetVersion,
  DatasetVersionCreatePayload,
} from "../types/dataset";

export const datasetApi = {
  getProjectDatasets: async (projectId: string): Promise<Dataset[]> => {
    const response = await api.get<Dataset[]>(
      `/projects/${projectId}/datasets`
    );
    return response.data;
  },

  createDataset: async (
    projectId: string,
    payload: DatasetCreatePayload
  ): Promise<Dataset> => {
    const response = await api.post<Dataset>(
      `/projects/${projectId}/datasets`,
      payload
    );
    return response.data;
  },

  getDatasetDetail: async (datasetId: string): Promise<Dataset> => {
    const response = await api.get<Dataset>(`/datasets/${datasetId}`);
    return response.data;
  },

  createDatasetVersion: async (
    datasetId: string,
    payload: DatasetVersionCreatePayload
  ): Promise<DatasetVersion> => {
    const response = await api.post<DatasetVersion>(
      `/datasets/${datasetId}/versions`,
      payload
    );
    return response.data;
  },

  getDatasetVersionDetail: async (
    versionId: string
  ): Promise<DatasetVersion> => {
    const response = await api.get<DatasetVersion>(
      `/dataset-versions/${versionId}`
    );
    return response.data;
  },

  listVersionAssets: async (
    versionId: string,
    limit = 100,
    offset = 0
  ): Promise<Asset[]> => {
    const response = await api.get<Asset[]>(
      `/dataset-versions/${versionId}/assets`,
      { params: { limit, offset } }
    );
    return response.data;
  },

  uploadVersionAssets: async (
    versionId: string,
    formData: FormData
  ): Promise<BatchUploadResult> => {
    const response = await api.post<BatchUploadResult>(
      `/dataset-versions/${versionId}/assets`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  removeVersionAsset: async (
    versionId: string,
    assetId: string
  ): Promise<void> => {
    await api.delete(`/dataset-versions/${versionId}/assets/${assetId}`);
  },

  publishDatasetVersion: async (versionId: string): Promise<DatasetVersion> => {
    const response = await api.put<DatasetVersion>(
      `/dataset-versions/${versionId}/publish`
    );
    return response.data;
  },

  getAssetDetail: async (assetId: string): Promise<Asset> => {
    const response = await api.get<Asset>(`/assets/${assetId}`);
    return response.data;
  },

  getAssetDownloadUrl: async (
    assetId: string
  ): Promise<AssetDownloadUrlResponse> => {
    const response = await api.get<AssetDownloadUrlResponse>(
      `/assets/${assetId}/download`
    );
    return response.data;
  },
};
