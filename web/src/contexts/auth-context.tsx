"use client";

import { createContext, useContext, useMemo } from "react";
import {
  type LoginInput,
  type User,
  useLoginMutation,
  useLogoutMutation,
  useUserQuery,
} from "@/features/auth";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, refetch } = useUserQuery();
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      isLoading,
      login: async (data: LoginInput) => {
        await loginMutation.mutateAsync(data);
      },
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
      refetchUser: () => {
        refetch();
      },
    }),
    [user, isLoading, loginMutation, logoutMutation, refetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
