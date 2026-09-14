"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategoryNodeFromForm,
  createDraftVersion,
  createInputNodeFromForm,
  createOntologyFromForm,
  createOutputNodeFromForm,
  exportVersionSchema,
  loadCategoryNodes,
  loadInputNodes,
  loadInputTypeOptions,
  loadOntologyVersions,
  loadOntologyWorkspace,
  loadOutputNodes,
  loadOutputTypeOptions,
  loadProjectOntologies,
  loadProjectOntology,
  loadVersionWorkspace,
  publishDraftVersion,
  removeCategoryNode,
  removeDraftVersion,
  removeInputNode,
  removeOntology,
  removeOutputNode,
  renameDraftVersion,
  saveVersionGraph,
  updateCategoryNodeFromForm,
  updateInputNodeFromForm,
  updateOntologyFromForm,
  updateOutputNodeFromForm,
  validateDraftVersion,
} from "../api";
import type {
  CategoryForm,
  InputDefinition,
  InputNodeForm,
  OntologyCompositionPayload,
  OntologyCreatePayload,
  OutputDefinition,
  OutputNodeForm,
} from "../types";

export const ONTOLOGY_KEYS = {
  project: (projectId: string) => ["ontologies", projectId] as const,
  projectSingle: (projectId: string) =>
    ["ontology", "project", projectId] as const,
  detail: (projectId: string, ontologyId: string) =>
    ["ontology", projectId, ontologyId] as const,
  definitions: ["ontology-definitions"] as const,
  nodes: (projectId: string, ontologyId: string) =>
    ["ontology-nodes", projectId, ontologyId] as const,
  versions: (projectId: string, ontologyId: string) =>
    ["ontology-versions", projectId, ontologyId] as const,
  version: (projectId: string, ontologyId: string, versionId: string) =>
    ["ontology-version", projectId, ontologyId, versionId] as const,
};

export function useProjectOntologyQuery(projectId: string) {
  return useQuery({
    queryKey: ONTOLOGY_KEYS.projectSingle(projectId),
    queryFn: () => loadProjectOntology(projectId),
    enabled: Boolean(projectId),
  });
}

export function useProjectOntologiesQuery(projectId: string) {
  return useQuery({
    queryKey: ONTOLOGY_KEYS.project(projectId),
    queryFn: () => loadProjectOntologies(projectId),
    enabled: Boolean(projectId),
  });
}

export function useOntologySchemaQuery(
  projectId: string,
  ontologyId: string,
  versionId: string
) {
  return useQuery({
    queryKey: [
      ...ONTOLOGY_KEYS.version(projectId, ontologyId, versionId),
      "schema",
    ],
    queryFn: () => exportVersionSchema(projectId, ontologyId, versionId),
    enabled: Boolean(projectId && ontologyId && versionId),
  });
}

export function useOntologyWorkspace(
  projectId: string,
  ontologyId: string,
  versionId: string
) {
  return {
    ontology: useQuery({
      queryKey: ONTOLOGY_KEYS.detail(projectId, ontologyId),
      queryFn: () => loadOntologyWorkspace(projectId, ontologyId),
      enabled: Boolean(ontologyId),
    }),
    inputDefinitions: useQuery({
      queryKey: [...ONTOLOGY_KEYS.definitions, "inputs"],
      queryFn: loadInputTypeOptions,
    }),
    outputDefinitions: useQuery({
      queryKey: [...ONTOLOGY_KEYS.definitions, "outputs"],
      queryFn: loadOutputTypeOptions,
    }),
    inputs: useQuery({
      queryKey: [...ONTOLOGY_KEYS.nodes(projectId, ontologyId), "inputs"],
      queryFn: () => loadInputNodes(projectId, ontologyId),
      enabled: Boolean(ontologyId),
    }),
    outputs: useQuery({
      queryKey: [...ONTOLOGY_KEYS.nodes(projectId, ontologyId), "outputs"],
      queryFn: () => loadOutputNodes(projectId, ontologyId),
      enabled: Boolean(ontologyId),
    }),
    categories: useQuery({
      queryKey: [...ONTOLOGY_KEYS.nodes(projectId, ontologyId), "categories"],
      queryFn: () => loadCategoryNodes(projectId, ontologyId),
      enabled: Boolean(ontologyId),
    }),
    versions: useQuery({
      queryKey: ONTOLOGY_KEYS.versions(projectId, ontologyId),
      queryFn: () => loadOntologyVersions(projectId, ontologyId),
      enabled: Boolean(ontologyId),
    }),
    version: useQuery({
      queryKey: ONTOLOGY_KEYS.version(projectId, ontologyId, versionId),
      queryFn: () => loadVersionWorkspace(projectId, ontologyId, versionId),
      enabled: Boolean(versionId),
    }),
  };
}

function useRefresh(
  projectId: string,
  ontologyId?: string,
  versionId?: string
) {
  const queryClient = useQueryClient();
  return async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: ONTOLOGY_KEYS.project(projectId),
    });
    if (ontologyId) {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ONTOLOGY_KEYS.detail(projectId, ontologyId),
        }),
        queryClient.invalidateQueries({
          queryKey: ONTOLOGY_KEYS.nodes(projectId, ontologyId),
        }),
        queryClient.invalidateQueries({
          queryKey: ONTOLOGY_KEYS.versions(projectId, ontologyId),
        }),
      ]);
    }
    if (ontologyId && versionId) {
      await queryClient.invalidateQueries({
        queryKey: ONTOLOGY_KEYS.version(projectId, ontologyId, versionId),
      });
    }
  };
}

export function useCreateOntologyMutation(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({
    mutationFn: (payload: OntologyCreatePayload) =>
      createOntologyFromForm(projectId, payload),
    onSuccess: refresh,
  });
}

export function useUpdateOntologyMutation(
  projectId: string,
  ontologyId: string
) {
  const refresh = useRefresh(projectId, ontologyId);
  return useMutation({
    mutationFn: (payload: Partial<OntologyCreatePayload>) =>
      updateOntologyFromForm(projectId, ontologyId, payload),
    onSuccess: refresh,
  });
}

export function useDeleteOntologyMutation(
  projectId: string,
  ontologyId: string
) {
  const refresh = useRefresh(projectId, ontologyId);
  return useMutation({
    mutationFn: () => removeOntology(projectId, ontologyId),
    onSuccess: refresh,
  });
}

export function useInputMutations(projectId: string, ontologyId: string) {
  const refresh = useRefresh(projectId, ontologyId);
  return {
    create: useMutation({
      mutationFn: ({
        form,
        definition,
      }: {
        form: InputNodeForm;
        definition: InputDefinition;
      }) => createInputNodeFromForm(projectId, ontologyId, form, definition),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({
        id,
        form,
        definition,
      }: {
        id: string;
        form: InputNodeForm;
        definition: InputDefinition;
      }) =>
        updateInputNodeFromForm(projectId, ontologyId, id, form, definition),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => removeInputNode(projectId, ontologyId, id),
      onSuccess: refresh,
    }),
  };
}

export function useOutputMutations(projectId: string, ontologyId: string) {
  const refresh = useRefresh(projectId, ontologyId);
  return {
    create: useMutation({
      mutationFn: ({
        form,
        definition,
      }: {
        form: OutputNodeForm;
        definition: OutputDefinition;
      }) => createOutputNodeFromForm(projectId, ontologyId, form, definition),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({
        id,
        form,
        definition,
      }: {
        id: string;
        form: OutputNodeForm;
        definition: OutputDefinition;
      }) =>
        updateOutputNodeFromForm(projectId, ontologyId, id, form, definition),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => removeOutputNode(projectId, ontologyId, id),
      onSuccess: refresh,
    }),
  };
}

export function useCategoryMutations(projectId: string, ontologyId: string) {
  const refresh = useRefresh(projectId, ontologyId);
  return {
    create: useMutation({
      mutationFn: (form: CategoryForm) =>
        createCategoryNodeFromForm(projectId, ontologyId, form),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, form }: { id: string; form: CategoryForm }) =>
        updateCategoryNodeFromForm(projectId, ontologyId, id, form),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => removeCategoryNode(projectId, ontologyId, id),
      onSuccess: refresh,
    }),
  };
}

export function useVersionMutations(
  projectId: string,
  ontologyId: string,
  versionId: string
) {
  const refresh = useRefresh(projectId, ontologyId, versionId);
  return {
    create: useMutation({
      mutationFn: (payload: {
        name?: string;
        based_on_version_id?: string | null;
      }) => createDraftVersion(projectId, ontologyId, payload),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: (name: string) =>
        renameDraftVersion(projectId, ontologyId, versionId, name),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: () => removeDraftVersion(projectId, ontologyId, versionId),
      onSuccess: refresh,
    }),
    compose: useMutation({
      mutationFn: (payload: OntologyCompositionPayload) =>
        saveVersionGraph(projectId, ontologyId, versionId, payload),
      onSuccess: refresh,
    }),
    validate: useMutation({
      mutationFn: () => validateDraftVersion(projectId, ontologyId, versionId),
    }),
    publish: useMutation({
      mutationFn: () => publishDraftVersion(projectId, ontologyId, versionId),
      onSuccess: refresh,
    }),
    exportSchema: useMutation({
      mutationFn: () => exportVersionSchema(projectId, ontologyId, versionId),
    }),
  };
}
