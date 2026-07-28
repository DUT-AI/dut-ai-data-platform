import { api } from "@/lib/api";
import {
  Attribute,
  AttributeCreatePayload,
  AttributeUpdatePayload,
  Category,
  CategoryCreatePayload,
  CategoryUpdatePayload,
  Ontology,
  OntologyCreatePayload,
  OntologyVersion,
} from "../types/ontology";

export const ontologyApi = {
  getProjectOntologies: async (projectId: string): Promise<Ontology[]> => {
    const response = await api.get<Ontology[]>(
      `/projects/${projectId}/ontologies`
    );
    return response.data;
  },

  createOntology: async (
    projectId: string,
    payload: OntologyCreatePayload
  ): Promise<Ontology> => {
    const response = await api.post<Ontology>(
      `/projects/${projectId}/ontologies`,
      payload
    );
    return response.data;
  },

  getOntologyVersion: async (versionId: string): Promise<OntologyVersion> => {
    const response = await api.get<OntologyVersion>(
      `/ontology-versions/${versionId}`
    );
    return response.data;
  },

  publishOntologyVersion: async (
    versionId: string
  ): Promise<OntologyVersion> => {
    const response = await api.put<OntologyVersion>(
      `/ontology-versions/${versionId}/publish`
    );
    return response.data;
  },

  cloneOntologyVersion: async (
    versionId: string,
    newVersion: string
  ): Promise<OntologyVersion> => {
    const response = await api.post<OntologyVersion>(
      `/ontology-versions/${versionId}/clone`,
      { version: newVersion }
    );
    return response.data;
  },

  createCategory: async (
    versionId: string,
    payload: CategoryCreatePayload
  ): Promise<Category> => {
    const response = await api.post<Category>(
      `/ontology-versions/${versionId}/categories`,
      payload
    );
    return response.data;
  },

  updateCategory: async (
    categoryId: string,
    payload: CategoryUpdatePayload
  ): Promise<Category> => {
    const response = await api.put<Category>(
      `/categories/${categoryId}`,
      payload
    );
    return response.data;
  },

  deleteCategory: async (categoryId: string): Promise<void> => {
    await api.delete(`/categories/${categoryId}`);
  },

  createAttribute: async (
    categoryId: string,
    payload: AttributeCreatePayload
  ): Promise<Attribute> => {
    const response = await api.post<Attribute>(
      `/categories/${categoryId}/attributes`,
      payload
    );
    return response.data;
  },

  updateAttribute: async (
    attributeId: string,
    payload: AttributeUpdatePayload
  ): Promise<Attribute> => {
    const response = await api.put<Attribute>(
      `/attributes/${attributeId}`,
      payload
    );
    return response.data;
  },

  deleteAttribute: async (attributeId: string): Promise<void> => {
    await api.delete(`/attributes/${attributeId}`);
  },
};
