import type { Schema } from "@/types/api";

// ---- API contract: generated from backend DTOs ----
type AssetDTO = Schema<"AssetResponseDTO">;

/**
 * `metadata` is free-form JSON in the backend (`dict[str, Any]`). These are the
 * keys the importer writes when it knows them; anything else stays `unknown`.
 */
export interface AssetMetadata {
  width?: number;
  height?: number;
  format?: string;
  page_count?: number;
  [key: string]: unknown;
}

export type Asset = Omit<AssetDTO, "metadata"> & {
  metadata: AssetMetadata | null;
};
export type AssetStatus = AssetDTO["status"];

export type DatasetVersion = Schema<"DatasetVersionResponseDTO">;
export type VersionStatus = DatasetVersion["status"];
export type Dataset = Schema<"DatasetResponseDTO">;
export type DatasetStatus = Dataset["status"];

export type DatasetCreatePayload = Schema<"DatasetCreateDTO">;
export type DatasetUpdatePayload = Schema<"DatasetUpdateDTO">;
export type DatasetVersionCreatePayload = Schema<"DatasetVersionCreateDTO">;

export type BatchUploadResult = Schema<"BatchUploadResultDTO">;
export type AssetDownloadUrlResponse = Schema<"AssetDownloadUrlResponseDTO">;
export type CursorPageAssetResponse = Schema<"CursorPageAssetResponseDTO">;

export type InheritDatasetVersionRequest =
  Schema<"InheritDatasetVersionRequestDTO">;
export type InheritDatasetVersionResponse =
  Schema<"InheritDatasetVersionResponseDTO">;

export type PrepareUploadItem = Schema<"PrepareUploadItemDTO">;
export type PrepareUploadPayload = Schema<"PrepareUploadRequestDTO">;
export type PresignedUploadUrlItem = Schema<"PresignedUploadUrlItemDTO">;
export type PrepareUploadResponse = Schema<"PrepareUploadResponseDTO">;

export type FinalizeAssetImportItem = Schema<"FinalizeAssetImportItemDTO">;
export type FinalizeAssetImportPayload =
  Schema<"FinalizeAssetImportRequestDTO">;
export type FinalizeAssetImportResponse =
  Schema<"FinalizeAssetImportResponseDTO">;
