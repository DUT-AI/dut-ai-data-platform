import { api } from "@/lib/api";
import { Project, ProjectCreatePayload } from "../types/project";

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
};
