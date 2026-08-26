import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "../api";
import {
  ProjectCreatePayload,
  ProjectUpdatePayload,
} from "../types";

export const PROJECT_KEYS = {
  all: ["projects"] as const,
  lists: () => [...PROJECT_KEYS.all, "list"] as const,
  list: (page: number, pageSize: number) =>
    [...PROJECT_KEYS.lists(), { page, pageSize }] as const,
  details: () => [...PROJECT_KEYS.all, "detail"] as const,
  detail: (id: string) => [...PROJECT_KEYS.details(), id] as const,
  config: (id: string) => [...PROJECT_KEYS.detail(id), "config"] as const,
};

export function useProjectsQuery(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: PROJECT_KEYS.list(page, pageSize),
    queryFn: () => projectApi.getProjects(page, pageSize),
  });
}

export function useProjectQuery(id: string) {
  return useQuery({
    queryKey: PROJECT_KEYS.detail(id),
    queryFn: () => projectApi.getProjectById(id),
    enabled: Boolean(id),
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProjectCreatePayload) =>
      projectApi.createProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    },
  });
}

export function useUpdateProjectMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProjectUpdatePayload) =>
      projectApi.updateProject(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
    },
  });
}

export function useArchiveProjectMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => projectApi.archiveProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
    },
  });
}

export function useProjectConfigQuery(id: string) {
  return useQuery({
    queryKey: PROJECT_KEYS.config(id),
    queryFn: () => projectApi.getProjectConfig(id),
    enabled: Boolean(id),
  });
}

export function useUpdateConfigMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Record<string, unknown>) =>
      projectApi.updateProjectConfig(id, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.config(id) });
    },
  });
}
