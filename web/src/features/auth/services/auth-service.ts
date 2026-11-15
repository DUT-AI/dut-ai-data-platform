import { api } from "@/lib/api";
import type {
  LoginPayload,
  LogoutResponse,
  TokenResponse,
  User,
} from "../types";

export const authService = {
  async login(payload: LoginPayload): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>("/auth/login", payload);
    return data;
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<User>("/auth/me");
    return data;
  },

  async logout(): Promise<void> {
    await api.post<LogoutResponse>("/auth/logout");
  },
};
