"use client";

import { useUserQuery, useLogoutMutation } from "@/features/auth";

export function DashboardOverview() {
  const { data: user, isLoading } = useUserQuery();
  const logoutMutation = useLogoutMutation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-400">
        <span className="text-sm font-medium">Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Top Navigation / User Header */}
        <header className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={user.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            <div>
              <h1 className="text-base font-semibold">
                {user?.name || "Người dùng"}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {logoutMutation.isPending ? "Đang xử lý..." : "Đăng xuất"}
          </button>
        </header>

        {/* Dashboard Content */}
        <main className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Trạng thái tài khoản
            </p>
            <p className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {user?.status || "ACTIVE"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Vai trò
            </p>
            <p className="mt-2 text-sm font-semibold">
              {user?.role_names?.join(", ") || "N/A"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Hệ thống
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Sẵn sàng
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
