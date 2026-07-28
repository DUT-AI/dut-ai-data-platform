import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "../api/project-api";
import { ProjectCreatePayload } from "../types/project";

export const PROJECT_KEYS = {
  all: ["projects"] as const,
  lists: () => [...PROJECT_KEYS.all, "list"] as const,
  list: (page: number, pageSize: number) =>
    [...PROJECT_KEYS.lists(), { page, pageSize }] as const,
  details: () => [...PROJECT_KEYS.all, "detail"] as const,
  detail: (id: string) => [...PROJECT_KEYS.details(), id] as const,
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
    mutationFn: (payload: ProjectCreatePayload) => projectApi.createProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    },
  });
}
