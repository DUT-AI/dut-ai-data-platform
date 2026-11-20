"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { AppShell } from "@/components/layout/app-shell";
import { redirectToSsoLogin } from "@/lib/auth-urls";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      redirectToSsoLogin();
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-xs font-medium">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
