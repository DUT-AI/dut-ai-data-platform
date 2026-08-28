export interface UserRead {
  id: string | number;
  name: string;
  email: string;
  status: string;
  avatar_url: string | null;
  role_names: string[];
  last_login_at: string | null;
}

export interface UsersListResponse {
  items: UserRead[];
  total: number;
  page: number;
  page_size: number;
}

export interface UserQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
}
