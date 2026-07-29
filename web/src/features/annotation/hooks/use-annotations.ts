import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAnnotation,
  createRevision,
  getAnnotationDetail,
  getRevisionDetail,
  listAnnotationRevisions,
  listAssetAnnotations,
} from "../api/annotation-api";
import { CreateAnnotationRequest, CreateRevisionRequest } from "../types/annotation";

export const annotationKeys = {
  all: ["annotations"] as const,
  asset: (assetId: string) => [...annotationKeys.all, "asset", assetId] as const,
  detail: (id: string) => [...annotationKeys.all, "detail", id] as const,
  revisions: (id: string) => [...annotationKeys.all, "revisions", id] as const,
  revisionDetail: (id: string) => [...annotationKeys.all, "revision", id] as const,
};

export function useAssetAnnotationsQuery(assetId: string) {
  return useQuery({
    queryKey: annotationKeys.asset(assetId),
    queryFn: () => listAssetAnnotations(assetId),
    enabled: Boolean(assetId),
  });
}

export function useAnnotationDetailQuery(annotationId: string) {
  return useQuery({
    queryKey: annotationKeys.detail(annotationId),
    queryFn: () => getAnnotationDetail(annotationId),
    enabled: Boolean(annotationId),
  });
}

export function useAnnotationRevisionsQuery(annotationId: string) {
  return useQuery({
    queryKey: annotationKeys.revisions(annotationId),
    queryFn: () => listAnnotationRevisions(annotationId),
    enabled: Boolean(annotationId),
  });
}

export function useRevisionDetailQuery(revisionId: string) {
  return useQuery({
    queryKey: annotationKeys.revisionDetail(revisionId),
    queryFn: () => getRevisionDetail(revisionId),
    enabled: Boolean(revisionId),
  });
}

export function useCreateAnnotationMutation(assetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateAnnotationRequest) => createAnnotation(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annotationKeys.asset(assetId) });
    },
  });
}

export function useCreateRevisionMutation(annotationId: string, assetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateRevisionRequest) =>
      createRevision(annotationId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annotationKeys.detail(annotationId) });
      queryClient.invalidateQueries({ queryKey: annotationKeys.revisions(annotationId) });
      queryClient.invalidateQueries({ queryKey: annotationKeys.asset(assetId) });
    },
  });
}
