export type SnapshotStatus = "CREATING" | "READY" | "ARCHIVED" | "FAILED";

export type SelectionPolicy = "LATEST_APPROVED" | "LATEST_SUBMITTED";

export type SplitStrategy = "RANDOM" | "STRATIFIED";

export type SplitType = "train" | "validation" | "test";

export type DiffChangeType = "added" | "removed" | "modified" | "split_changed";

export interface SplitRatiosDTO {
  train: number;
  validation: number;
  test: number;
}

export interface SnapshotCreateRequest {
  dataset_version_id: string;
  ontology_version_id: string;
  version_name?: string | null;
  selection_policy?: SelectionPolicy;
  include_unannotated?: boolean;
  split_strategy?: SplitStrategy;
  split_ratios?: SplitRatiosDTO;
  split_seed?: number | null;
}

export interface SnapshotResponse {
  id: string;
  project_id: string;
  dataset_version_id: string;
  ontology_version_id: string;
  version_name: string;
  status: SnapshotStatus;
  selection_policy: SelectionPolicy;
  include_unannotated: boolean;
  split_strategy: SplitStrategy;
  split_ratios: Record<string, number>;
  split_seed?: number | null;
  tags: string[];
  error_code?: string | null;
  error_message?: string | null;
  created_by: number;
  created_at: string;
  finalized_at?: string | null;
  archived_at?: string | null;
}

export interface SnapshotCancelResponse {
  message: string;
  snapshot: SnapshotResponse;
}

export interface SnapshotItemResponse {
  id: string;
  snapshot_id: string;
  asset_id: string;
  annotation_revision_id?: string | null;
  split: string;
  item_checksum: string;
  sort_order: number;
}

export interface SnapshotItemListResponse {
  items: SnapshotItemResponse[];
  next_cursor?: string | null;
  total_count: number;
}

export interface SnapshotManifestResponse {
  snapshot_id: string;
  dataset_version_id: string;
  ontology_version_id: string;
  asset_count: number;
  annotation_count: number;
  split_distribution: Record<string, { count: number; percentage: number }>;
  class_distribution: Record<string, Record<string, number>>;
  aggregate_checksum: string;
  storage_uri: string;
  created_at: string;
}

export interface SnapshotDiffSummaryResponse {
  base_snapshot_id: string;
  target_snapshot_id: string;
  added_asset_count: number;
  removed_asset_count: number;
  modified_annotation_count: number;
  split_movement_count: number;
  class_distribution_deltas: Record<string, number>;
}

export interface SnapshotDiffItemDTO {
  asset_id: string;
  change_type: DiffChangeType;
  base_revision_id?: string | null;
  target_revision_id?: string | null;
  base_split?: string | null;
  target_split?: string | null;
}

export interface SnapshotDiffItemsResponse {
  items: SnapshotDiffItemDTO[];
  next_cursor?: string | null;
}

export interface ReleaseTagCreateRequest {
  name: string;
}

export interface ReleaseTagResponse {
  name: string;
  snapshot_id: string;
  project_id: string;
  created_by: number;
  created_at: string;
  updated_at?: string | null;
}

