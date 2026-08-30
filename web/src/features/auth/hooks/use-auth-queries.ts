"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authService } from "../services";
import type { LoginInput } from "../types";

export const AUTH_QUERY_KEY = ["auth", "me"] as const;

export function useUserQuery() {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: () => authService.getMe(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginInput) => authService.login(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      router.push("/dashboard");
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      router.push("/login");
    },
    onError: async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      router.push("/login");
    },
  });
}
