export type SelectorType =
  | "FULL_ASSET"
  | "RECORD"
  | "TEXT_SPAN"
  | "TIME_RANGE"
  | "FRAME_RANGE"
  | "DOCUMENT_PAGE";

export type ResultType =
  "bbox" | "polygon" | "text_region" | "caption" | "classification" | "ner";

export type RevisionSource = "human" | "machine";

export interface AnnotationResult {
  id?: string;
  output_id?: string;
  category_id?: string | null;
  result_type?: string;
  value?: unknown;
  geometry?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    points?: number[][];
    [key: string]: unknown;
  } | null;
  payload?: Record<string, unknown> | null;
  attributes?: Record<string, unknown> | null;
  confidence?: number;
  created_at?: string;
}

export interface AnnotationRevision {
  id: string;
  annotation_id: string;
  revision_number: number;
  ontology_version_id: string;
  created_by: string;
  source: RevisionSource;
  created_at?: string;
  results: AnnotationResult[];
  category_ids?: string[];
}

export interface Annotation {
  id: string;
  asset_id: string;
  project_id: string;
  target_type: SelectorType;
  target_selector: Record<string, unknown>;
  ontology_version_id?: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  latest_revision?: AnnotationRevision;
  revisions?: AnnotationRevision[];
}

export interface CreateAnnotationRequest {
  asset_id: string;
  project_id: string;
  ontology_version_id: string;
  target_type?: SelectorType;
  target_selector?: Record<string, unknown>;
  source?: RevisionSource;
  results: AnnotationResult[];
}

export interface CreateRevisionRequest {
  ontology_version_id: string;
  source?: RevisionSource;
  results: AnnotationResult[];
}
