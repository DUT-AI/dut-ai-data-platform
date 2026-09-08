import { api } from "@/lib/api";
import type { Category, CategoryForm, ExportedOntologySchema, InputDefinition, InputNodeForm, Ontology, OntologyCompositionPayload, OntologyCreatePayload, OntologyInput, OntologyOutput, OntologyVersion, OutputDefinition, OutputNodeForm, ValidationResult } from "../types";
import { toCategoryNodeRequest, toCategoryNodeUpdateRequest, toInputNodeRequest, toOutputNodeRequest } from "./ontology-mappers";

/* ------------------------------------------------------------------ */
/*  URL helpers (private)                                              */
/* ------------------------------------------------------------------ */

const root = (projectId: string, ontologyId: string): string =>
  `/projects/${projectId}/ontologies/${ontologyId}`;

const versionRoot = (
  projectId: string,
  ontologyId: string,
  versionId: string
): string => `${root(projectId, ontologyId)}/versions/${versionId}`;

/* ------------------------------------------------------------------ */
/*  Ontology                                                          */
/* ------------------------------------------------------------------ */

export async function loadProjectOntologies(
  projectId: string
): Promise<Ontology[]> {
  return (await api.get<Ontology[]>(`/projects/${projectId}/ontologies`)).data;
}

export async function loadOntologyWorkspace(
  projectId: string,
  ontologyId: string
): Promise<Ontology> {
  return (await api.get<Ontology>(root(projectId, ontologyId))).data;
}

export async function createOntologyFromForm(
  projectId: string,
  payload: OntologyCreatePayload
): Promise<Ontology> {
  return (
    await api.post<Ontology>(`/projects/${projectId}/ontologies`, payload)
  ).data;
}

export async function updateOntologyFromForm(
  projectId: string,
  ontologyId: string,
  payload: Partial<OntologyCreatePayload>
): Promise<Ontology> {
  return (await api.patch<Ontology>(root(projectId, ontologyId), payload)).data;
}

export async function removeOntology(
  projectId: string,
  ontologyId: string
): Promise<void> {
  await api.delete(root(projectId, ontologyId));
}

/* ------------------------------------------------------------------ */
/*  Input / Output Type Options (definitions)                         */
/* ------------------------------------------------------------------ */

export async function loadInputTypeOptions(): Promise<InputDefinition[]> {
  return (await api.get<InputDefinition[]>("/ontology-definitions/inputs"))
    .data;
}

export async function loadOutputTypeOptions(): Promise<OutputDefinition[]> {
  return (await api.get<OutputDefinition[]>("/ontology-definitions/outputs"))
    .data;
}

/* ------------------------------------------------------------------ */
/*  Input nodes                                                       */
/* ------------------------------------------------------------------ */

export async function loadInputNodes(
  projectId: string,
  ontologyId: string
): Promise<OntologyInput[]> {
  return (
    await api.get<OntologyInput[]>(`${root(projectId, ontologyId)}/inputs`)
  ).data;
}

export async function createInputNodeFromForm(
  projectId: string,
  ontologyId: string,
  form: InputNodeForm,
  definition: InputDefinition
): Promise<OntologyInput> {
  return (
    await api.post<OntologyInput>(
      `${root(projectId, ontologyId)}/inputs`,
      toInputNodeRequest(form, definition)
    )
  ).data;
}

export async function updateInputNodeFromForm(
  projectId: string,
  ontologyId: string,
  inputId: string,
  form: InputNodeForm,
  definition: InputDefinition
): Promise<OntologyInput> {
  return (
    await api.patch<OntologyInput>(
      `${root(projectId, ontologyId)}/inputs/${inputId}`,
      toInputNodeRequest(form, definition)
    )
  ).data;
}

export async function removeInputNode(
  projectId: string,
  ontologyId: string,
  inputId: string
): Promise<void> {
  await api.delete(`${root(projectId, ontologyId)}/inputs/${inputId}`);
}

/* ------------------------------------------------------------------ */
/*  Output nodes                                                      */
/* ------------------------------------------------------------------ */

export async function loadOutputNodes(
  projectId: string,
  ontologyId: string
): Promise<OntologyOutput[]> {
  return (
    await api.get<OntologyOutput[]>(`${root(projectId, ontologyId)}/outputs`)
  ).data;
}

export async function createOutputNodeFromForm(
  projectId: string,
  ontologyId: string,
  form: OutputNodeForm,
  definition: OutputDefinition
): Promise<OntologyOutput> {
  return (
    await api.post<OntologyOutput>(
      `${root(projectId, ontologyId)}/outputs`,
      toOutputNodeRequest(form, definition)
    )
  ).data;
}

export async function updateOutputNodeFromForm(
  projectId: string,
  ontologyId: string,
  outputId: string,
  form: OutputNodeForm,
  definition: OutputDefinition
): Promise<OntologyOutput> {
  return (
    await api.patch<OntologyOutput>(
      `${root(projectId, ontologyId)}/outputs/${outputId}`,
      toOutputNodeRequest(form, definition)
    )
  ).data;
}

export async function removeOutputNode(
  projectId: string,
  ontologyId: string,
  outputId: string
): Promise<void> {
  await api.delete(`${root(projectId, ontologyId)}/outputs/${outputId}`);
}

/* ------------------------------------------------------------------ */
/*  Category nodes                                                    */
/* ------------------------------------------------------------------ */

export async function loadCategoryNodes(
  projectId: string,
  ontologyId: string
): Promise<Category[]> {
  return (
    await api.get<Category[]>(`${root(projectId, ontologyId)}/categories`)
  ).data;
}

export async function createCategoryNodeFromForm(
  projectId: string,
  ontologyId: string,
  form: CategoryForm
): Promise<Category> {
  return (
    await api.post<Category>(
      `${root(projectId, ontologyId)}/categories`,
      toCategoryNodeRequest(form)
    )
  ).data;
}

export async function updateCategoryNodeFromForm(
  projectId: string,
  ontologyId: string,
  categoryId: string,
  form: CategoryForm
): Promise<Category> {
  return (
    await api.patch<Category>(
      `${root(projectId, ontologyId)}/categories/${categoryId}`,
      toCategoryNodeUpdateRequest(form)
    )
  ).data;
}

export async function removeCategoryNode(
  projectId: string,
  ontologyId: string,
  categoryId: string
): Promise<void> {
  await api.delete(`${root(projectId, ontologyId)}/categories/${categoryId}`);
}

/* ------------------------------------------------------------------ */
/*  Versions                                                          */
/* ------------------------------------------------------------------ */

export async function loadOntologyVersions(
  projectId: string,
  ontologyId: string
): Promise<OntologyVersion[]> {
  return (
    await api.get<OntologyVersion[]>(`${root(projectId, ontologyId)}/versions`)
  ).data;
}

export async function loadVersionWorkspace(
  projectId: string,
  ontologyId: string,
  versionId: string
): Promise<OntologyVersion> {
  return (
    await api.get<OntologyVersion>(
      versionRoot(projectId, ontologyId, versionId)
    )
  ).data;
}

export async function createDraftVersion(
  projectId: string,
  ontologyId: string,
  payload: { name?: string; based_on_version_id?: string | null }
): Promise<OntologyVersion> {
  return (
    await api.post<OntologyVersion>(
      `${root(projectId, ontologyId)}/versions`,
      payload
    )
  ).data;
}

export async function renameDraftVersion(
  projectId: string,
  ontologyId: string,
  versionId: string,
  name: string
): Promise<OntologyVersion> {
  return (
    await api.patch<OntologyVersion>(
      versionRoot(projectId, ontologyId, versionId),
      { name }
    )
  ).data;
}

export async function removeDraftVersion(
  projectId: string,
  ontologyId: string,
  versionId: string
): Promise<void> {
  await api.delete(versionRoot(projectId, ontologyId, versionId));
}

export async function saveVersionGraph(
  projectId: string,
  ontologyId: string,
  versionId: string,
  payload: OntologyCompositionPayload
): Promise<OntologyVersion> {
  return (
    await api.put<OntologyVersion>(
      `${versionRoot(projectId, ontologyId, versionId)}/composition`,
      payload
    )
  ).data;
}

export async function validateDraftVersion(
  projectId: string,
  ontologyId: string,
  versionId: string
): Promise<ValidationResult> {
  return (
    await api.post<ValidationResult>(
      `${versionRoot(projectId, ontologyId, versionId)}/validate`
    )
  ).data;
}

export async function publishDraftVersion(
  projectId: string,
  ontologyId: string,
  versionId: string
): Promise<OntologyVersion> {
  return (
    await api.post<OntologyVersion>(
      `${versionRoot(projectId, ontologyId, versionId)}/publish`
    )
  ).data;
}

export async function exportVersionSchema(
  projectId: string,
  ontologyId: string,
  versionId: string
): Promise<ExportedOntologySchema> {
  return (
    await api.get<ExportedOntologySchema>(
      `${versionRoot(projectId, ontologyId, versionId)}/schema`
    )
  ).data;
}
