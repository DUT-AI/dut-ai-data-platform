import type { Schema } from "@/types/api";

// ---- API contract: generated from backend DTOs ----
export type UserRead = Schema<"UserReadDTO">;
export type UsersListResponse = Schema<"UsersListResponseDTO">;

// ---- FE-only: arguments of userApi.getUsers (mapped to page/page_size/search) ----
export interface UserQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
}
