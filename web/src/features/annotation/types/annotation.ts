export type ResultType =
  "bbox" | "polygon" | "text_region" | "caption" | "classification" | "ner";

export type RevisionSource = "human" | "machine";

export interface AnnotationResult {
  id: string;
  revision_id: string;
  category_id?: string | null;
  result_type: ResultType;
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
  created_at?: string;
}

export interface AnnotationRevision {
  id: string;
  annotation_id: string;
  revision_number: number;
  created_by: string;
  source: RevisionSource;
  created_at?: string;
  results: AnnotationResult[];
}

export interface Annotation {
  id: string;
  asset_id: string;
  project_id: string;
  ontology_version_id: string;
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
  source?: RevisionSource;
  results: {
    category_id?: string;
    result_type: ResultType;
    geometry?: Record<string, unknown>;
    payload?: Record<string, unknown>;
    attributes?: Record<string, unknown>;
  }[];
}

export interface CreateRevisionRequest {
  source?: RevisionSource;
  results: {
    category_id?: string;
    result_type: ResultType;
    geometry?: Record<string, unknown>;
    payload?: Record<string, unknown>;
    attributes?: Record<string, unknown>;
  }[];
}
