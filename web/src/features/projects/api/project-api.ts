import { api } from "@/lib/api";
import {
  Project,
  ProjectConfig,
  ProjectCreatePayload,
  ProjectUpdatePayload,
} from "../types";

export const projectApi = {
  getProjects: async (page = 1, pageSize = 50): Promise<Project[]> => {
    const response = await api.get<Project[]>("/projects", {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  getProjectById: async (id: string): Promise<Project> => {
    const response = await api.get<Project>(`/projects/${id}`);
    return response.data;
  },

  createProject: async (payload: ProjectCreatePayload): Promise<Project> => {
    const response = await api.post<Project>("/projects", payload);
    return response.data;
  },

  updateProject: async (
    id: string,
    payload: ProjectUpdatePayload
  ): Promise<Project> => {
    const response = await api.put<Project>(`/projects/${id}`, payload);
    return response.data;
  },

  archiveProject: async (id: string): Promise<Project> => {
    const response = await api.delete<Project>(`/projects/${id}`);
    return response.data;
  },

  getProjectConfig: async (id: string): Promise<ProjectConfig> => {
    const response = await api.get<ProjectConfig>(`/projects/${id}/config`);
    return response.data;
  },

  updateProjectConfig: async (
    id: string,
    settings: Record<string, unknown>
  ): Promise<ProjectConfig> => {
    const response = await api.put<ProjectConfig>(
      `/projects/${id}/config`,
      settings
    );
    return response.data;
  },
};
