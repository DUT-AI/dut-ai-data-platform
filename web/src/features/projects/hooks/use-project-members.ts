"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectMemberApi } from "../api";
import { ProjectMemberAddPayload, ProjectMemberRole } from "../types";

export const PROJECT_MEMBER_KEYS = {
  all: ["project-members"] as const,
  members: (projectId: string) =>
    [...PROJECT_MEMBER_KEYS.all, projectId] as const,
};

export function useProjectMembersQuery(projectId: string) {
  return useQuery({
    queryKey: PROJECT_MEMBER_KEYS.members(projectId),
    queryFn: () => projectMemberApi.getProjectMembers(projectId),
    enabled: Boolean(projectId),
  });
}

export function useAddMemberMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProjectMemberAddPayload) =>
      projectMemberApi.addProjectMember(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROJECT_MEMBER_KEYS.members(projectId),
      });
    },
  });
}

export function useUpdateMemberRoleMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string;
      role: ProjectMemberRole;
    }) => projectMemberApi.updateProjectMember(projectId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROJECT_MEMBER_KEYS.members(projectId),
      });
    },
  });
}

export function useRemoveMemberMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) =>
      projectMemberApi.removeProjectMember(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROJECT_MEMBER_KEYS.members(projectId),
      });
    },
  });
}
