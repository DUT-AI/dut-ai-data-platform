import type { Schema } from "@/types/api";

// ---- API contract: generated from backend DTOs ----
type AnnotationDTO = Schema<"AnnotationResponseDTO">;
type AnnotationRevisionDTO = Schema<"AnnotationRevisionResponseDTO">;
type AnnotationCreateDTO = Schema<"AnnotationCreateDTO">;
type RevisionCreateDTO = Schema<"RevisionCreateDTO">;

export type SelectorType = AnnotationDTO["target_type"];
export type RevisionSource = AnnotationRevisionDTO["source"];

export type ResultType =
  | "bbox"
  | "polygon"
  | "text_region"
  | "caption"
  | "classification"
  /**
   * Used for both Named Entity Recognition spans and Question Answering answer spans.
   * QA results are distinguished from NER results by the presence of `payload.question`.
   */
  | "ner";

/**
 * One annotation result. The backend stores results as free-form JSON
 * (`list[dict[str, Any]]`) and validates them against the Ontology Version, so
 * this editor-side view of a result is the only hand-written shape here.
 */
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

type WithResults<T> = Omit<T, "results"> & { results: AnnotationResult[] };

export type AnnotationRevision = WithResults<AnnotationRevisionDTO>;

export type Annotation = Omit<
  AnnotationDTO,
  "latest_revision" | "revisions"
> & {
  latest_revision: AnnotationRevision | null;
  revisions: AnnotationRevision[];
};

export type CreateAnnotationRequest = Omit<AnnotationCreateDTO, "results"> & {
  results: AnnotationResult[];
};
export type CreateRevisionRequest = Omit<RevisionCreateDTO, "results"> & {
  results: AnnotationResult[];
};

export type BatchAssetStatusItem = Schema<"BatchAssetStatusItemDTO">;
export type BatchAssetStatusResponse = Schema<"BatchAssetStatusResponseDTO">;

export type OpenInLabelStudioRequest = Schema<"OpenInLabelStudioRequestDTO">;
export type OpenInLabelStudioResponse = Schema<"OpenInLabelStudioResponseDTO">;
