import { api } from "@/lib/api";
import { UserQueryParams, UsersListResponse } from "../types/user";

export const userApi = {
  getUsers: async (params: UserQueryParams = {}): Promise<UsersListResponse> => {
    const response = await api.get<UsersListResponse>("/users", {
      params: {
        page: params.page ?? 1,
        page_size: params.pageSize ?? 20,
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      },
    });
    return response.data;
  },
};
