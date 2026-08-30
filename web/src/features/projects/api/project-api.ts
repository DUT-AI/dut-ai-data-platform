import { api } from "@/lib/api";
import {
  Project,
  ProjectConfig,
  ProjectCreatePayload,
  ProjectMember,
  ProjectMemberAddPayload,
  ProjectMemberRole,
  ProjectUpdatePayload,
  TaskDefinition,
} from "../types/project";

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
    const response = await api.post<Project>(`/projects/${id}/archive`);
    return response.data;
  },

  restoreProject: async (id: string): Promise<Project> => {
    const response = await api.post<Project>(`/projects/${id}/restore`);
    return response.data;
  },

  getTaskDefinitions: async (): Promise<TaskDefinition[]> => {
    const response = await api.get<TaskDefinition[]>("/task-definitions");
    return response.data;
  },

  getProjectMembers: async (id: string): Promise<ProjectMember[]> => {
    const response = await api.get<ProjectMember[]>(`/projects/${id}/members`);
    return response.data;
  },

  addProjectMember: async (
    id: string,
    payload: ProjectMemberAddPayload
  ): Promise<ProjectMember> => {
    const response = await api.post<ProjectMember>(
      `/projects/${id}/members`,
      payload
    );
    return response.data;
  },

  updateProjectMember: async (
    id: string,
    memberId: string,
    role: ProjectMemberRole
  ): Promise<ProjectMember> => {
    const response = await api.put<ProjectMember>(
      `/projects/${id}/members/${memberId}`,
      { role }
    );
    return response.data;
  },

  removeProjectMember: async (id: string, memberId: string): Promise<void> => {
    await api.delete(`/projects/${id}/members/${memberId}`);
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
