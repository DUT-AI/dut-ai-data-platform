"use client";

import { useQuery } from "@tanstack/react-query";
import { userApi } from "../api/user-api";
import { UserQueryParams } from "../types/user";

export const USER_KEYS = {
  all: ["users"] as const,
  lists: () => [...USER_KEYS.all, "list"] as const,
  list: (params: UserQueryParams) =>
    [
      ...USER_KEYS.lists(),
      {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        search: params.search ?? "",
      },
    ] as const,
};

export function useUsersQuery(params: UserQueryParams = {}) {
  return useQuery({
    queryKey: USER_KEYS.list(params),
    queryFn: () => userApi.getUsers(params),
    staleTime: 30_000,
  });
}
