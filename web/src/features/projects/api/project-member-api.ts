import { api } from "@/lib/api";
import {
  ProjectMember,
  ProjectMemberAddPayload,
  ProjectMemberRole,
} from "../types";

export const projectMemberApi = {
  getProjectMembers: async (projectId: string): Promise<ProjectMember[]> => {
    const response = await api.get<ProjectMember[]>(
      `/projects/${projectId}/members`
    );
    return response.data;
  },

  addProjectMember: async (
    projectId: string,
    payload: ProjectMemberAddPayload
  ): Promise<ProjectMember> => {
    const response = await api.post<ProjectMember>(
      `/projects/${projectId}/members`,
      payload
    );
    return response.data;
  },

  updateProjectMember: async (
    projectId: string,
    memberId: string,
    role: ProjectMemberRole
  ): Promise<ProjectMember> => {
    const response = await api.put<ProjectMember>(
      `/projects/${projectId}/members/${memberId}`,
      { role }
    );
    return response.data;
  },

  removeProjectMember: async (
    projectId: string,
    memberId: string
  ): Promise<void> => {
    await api.delete(`/projects/${projectId}/members/${memberId}`);
  },
};
