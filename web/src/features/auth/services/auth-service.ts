import { api } from "@/lib/api";
import type { LoginPayload, LogoutResponse, User } from "../types";

export const authService = {
  async login(payload: LoginPayload): Promise<User> {
    const { data } = await api.post<User>("/auth/login", payload);
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
