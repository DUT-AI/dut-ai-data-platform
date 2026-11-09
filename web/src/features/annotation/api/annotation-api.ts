import { api } from "@/lib/api";
import {
  Annotation,
  AnnotationRevision,
  BatchAssetStatusResponse,
  CreateAnnotationRequest,
  CreateRevisionRequest,
} from "../types";

export async function listAssetAnnotations(
  assetId: string
): Promise<Annotation[]> {
  const { data } = await api.get<Annotation[]>(
    `/assets/${assetId}/annotations`
  );
  return data;
}

export async function getAnnotationDetail(
  annotationId: string
): Promise<Annotation> {
  const { data } = await api.get<Annotation>(`/annotations/${annotationId}`);
  return data;
}

export async function listAnnotationRevisions(
  annotationId: string
): Promise<AnnotationRevision[]> {
  const { data } = await api.get<AnnotationRevision[]>(
    `/annotations/${annotationId}/revisions`
  );
  return data;
}

export async function getRevisionDetail(
  revisionId: string
): Promise<AnnotationRevision> {
  const { data } = await api.get<AnnotationRevision>(
    `/annotation-revisions/${revisionId}`
  );
  return data;
}

export async function createAnnotation(
  request: CreateAnnotationRequest
): Promise<Annotation> {
  const { data } = await api.post<Annotation>("/annotations", request);
  return data;
}

export async function createRevision(
  annotationId: string,
  request: CreateRevisionRequest
): Promise<AnnotationRevision> {
  const { data } = await api.post<AnnotationRevision>(
    `/annotations/${annotationId}/revisions`,
    request
  );
  return data;
}

export async function getBatchAssetStatus(
  assetIds: string[]
): Promise<BatchAssetStatusResponse> {
  const { data } = await api.post<BatchAssetStatusResponse>(
    "/annotations/batch-status",
    { asset_ids: assetIds }
  );
  return data;
}
