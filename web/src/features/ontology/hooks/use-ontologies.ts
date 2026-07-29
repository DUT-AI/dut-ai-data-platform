import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ontologyApi } from "../api/ontology-api";
import {
  AttributeCreatePayload,
  AttributeUpdatePayload,
  CategoryCreatePayload,
  CategoryUpdatePayload,
  OntologyCreatePayload,
} from "../types/ontology";

export const ONTOLOGY_KEYS = {
  all: ["ontologies"] as const,
  projectLists: (projectId: string) =>
    [...ONTOLOGY_KEYS.all, "project", projectId] as const,
  versionDetail: (versionId: string) =>
    [...ONTOLOGY_KEYS.all, "version", versionId] as const,
};

export function useProjectOntologiesQuery(projectId: string) {
  return useQuery({
    queryKey: ONTOLOGY_KEYS.projectLists(projectId),
    queryFn: () => ontologyApi.getProjectOntologies(projectId),
    enabled: Boolean(projectId),
  });
}

export function useOntologyVersionQuery(versionId: string) {
  return useQuery({
    queryKey: ONTOLOGY_KEYS.versionDetail(versionId),
    queryFn: () => ontologyApi.getOntologyVersion(versionId),
    enabled: Boolean(versionId),
  });
}

export function useCreateOntologyMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: OntologyCreatePayload) =>
      ontologyApi.createOntology(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ONTOLOGY_KEYS.projectLists(projectId),
      });
    },
  });
}

export function usePublishVersionMutation(
  versionId: string,
  projectId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ontologyApi.publishOntologyVersion(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ONTOLOGY_KEYS.versionDetail(versionId),
      });
      queryClient.invalidateQueries({
        queryKey: ONTOLOGY_KEYS.projectLists(projectId),
      });
    },
  });
}

export function useCloneVersionMutation(versionId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newVersion: string) =>
      ontologyApi.cloneOntologyVersion(versionId, newVersion),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ONTOLOGY_KEYS.projectLists(projectId),
      });
    },
  });
}

export function useCreateCategoryMutation(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CategoryCreatePayload) =>
      ontologyApi.createCategory(versionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ONTOLOGY_KEYS.versionDetail(versionId),
      });
    },
  });
}

export function useUpdateCategoryMutation(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryId,
      payload,
    }: {
      categoryId: string;
      payload: CategoryUpdatePayload;
    }) => ontologyApi.updateCategory(categoryId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ONTOLOGY_KEYS.versionDetail(versionId),
      });
    },
  });
}

export function useDeleteCategoryMutation(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryId: string) => ontologyApi.deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ONTOLOGY_KEYS.versionDetail(versionId),
      });
    },
  });
}

export function useCreateAttributeMutation(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryId,
      payload,
    }: {
      categoryId: string;
      payload: AttributeCreatePayload;
    }) => ontologyApi.createAttribute(categoryId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ONTOLOGY_KEYS.versionDetail(versionId),
      });
    },
  });
}

export function useUpdateAttributeMutation(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      attributeId,
      payload,
    }: {
      attributeId: string;
      payload: AttributeUpdatePayload;
    }) => ontologyApi.updateAttribute(attributeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ONTOLOGY_KEYS.versionDetail(versionId),
      });
    },
  });
}

export function useDeleteAttributeMutation(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attributeId: string) =>
      ontologyApi.deleteAttribute(attributeId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ONTOLOGY_KEYS.versionDetail(versionId),
      });
    },
  });
}

export function useUpdateOntologyVersionMutation(versionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { raw_label_config: string | null }) =>
      ontologyApi.updateOntologyVersion(versionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ONTOLOGY_KEYS.versionDetail(versionId),
      });
    },
  });
}
