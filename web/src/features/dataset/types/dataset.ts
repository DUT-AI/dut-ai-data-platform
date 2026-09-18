export type DatasetStatus = "active" | "archived";
export type VersionStatus = "draft" | "published";

export interface Asset {
  id: string;
  project_id: string;
  filename: string;
  uri: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  metadata: {
    width?: number;
    height?: number;
    format?: string;
    page_count?: number;
    [key: string]: unknown;
  } | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DatasetVersion {
  id: string;
  dataset_id: string;
  version: string;
  status: VersionStatus;
  asset_count: number;
  created_at: string | null;
  updated_at: string | null;
  published_at: string | null;
  assets?: Asset[];
}

export interface Dataset {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: DatasetStatus;
  created_at: string | null;
  updated_at: string | null;
  versions?: DatasetVersion[];
}

export interface DatasetCreatePayload {
  name: string;
  description?: string;
}

export interface DatasetUpdatePayload {
  name?: string;
  description?: string;
}

export interface DatasetVersionCreatePayload {
  version: string;
}

export interface BatchUploadResult {
  uploaded_assets: Asset[];
  reused_assets_count: number;
  new_assets_count: number;
}

export interface AssetDownloadUrlResponse {
  asset_id: string;
  filename: string;
  download_url: string;
  expires_in_seconds: number;
}

export interface InheritDatasetVersionRequest {
  source_version_id: string;
}

export interface InheritDatasetVersionResponse {
  target_version_id: string;
  source_version_id: string;
  added_assets_count: number;
  reused_assets_count: number;
  total_assets_count: number;
}

export interface PrepareUploadItem {
  filename: string;
  content_type?: string;
}

export interface PrepareUploadPayload {
  files: PrepareUploadItem[];
}

export interface PresignedUploadUrlItem {
  filename: string;
  asset_id: string;
  storage_key: string;
  upload_url: string;
  expires_in_seconds: number;
}

export interface PrepareUploadResponse {
  items: PresignedUploadUrlItem[];
}

export interface FinalizeAssetImportItem {
  asset_id: string;
  filename: string;
  storage_key: string;
  sha256: string;
  file_size: number;
  mime_type: string;
  metadata?: Record<string, unknown>;
  data_format?: string;
  provenance?: Record<string, unknown>;
}

export interface FinalizeAssetImportPayload {
  items: FinalizeAssetImportItem[];
}

export interface FinalizeAssetImportResponse {
  imported_assets: Asset[];
  reused_assets_count: number;
  new_assets_count: number;
}


