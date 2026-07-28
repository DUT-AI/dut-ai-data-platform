import type { LoginInput } from "../schemas/login-schema";

export type User = {
  id: number | string;
  name: string;
  email: string;
  status: string;
  avatar_url?: string | null;
  role_names: string[];
};

export type LoginPayload = LoginInput;

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};
