"use client";

import { Badge } from "@/components/ui";
import { UserRead } from "../types/user";

interface UserListTableProps {
  users: UserRead[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "U";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatLastLogin(dateStr: string | null): string {
  if (!dateStr) return "Chưa đăng nhập";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Chưa đăng nhập";
    return d.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Chưa đăng nhập";
  }
}

export function UserListTable({
  users,
  isLoading,
  isError,
  onRetry,
}: UserListTableProps) {
  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
        <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
          Không thể tải danh sách người dùng. Vui lòng kiểm tra lại kết nối.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 inline-flex items-center rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700"
          >
            Thử lại
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            <tr>
              <th className="px-6 py-3.5">Người dùng</th>
              <th className="px-6 py-3.5">Email</th>
              <th className="px-6 py-3.5">Vai trò</th>
              <th className="px-6 py-3.5">Trạng thái</th>
              <th className="px-6 py-3.5">Lần đăng nhập cuối</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: 5 }).map((_, idx) => (
              <tr key={idx} className="animate-pulse">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-700" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">
        Chưa có người dùng để hiển thị.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          <tr>
            <th className="px-6 py-3.5">Người dùng</th>
            <th className="px-6 py-3.5">Email</th>
            <th className="px-6 py-3.5">Vai trò</th>
            <th className="px-6 py-3.5">Trạng thái</th>
            <th className="px-6 py-3.5">Lần đăng nhập cuối</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {users.map((user) => {
            const isLogged = Boolean(user.last_login_at);
            const isActive =
              user.status?.toUpperCase() === "ACTIVE" ||
              user.status?.toUpperCase() === "HOẠT ĐỘNG";

            return (
              <tr
                key={user.id}
                className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/60"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        {getInitials(user.name)}
                      </div>
                    )}
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {user.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                  {user.email}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {user.role_names && user.role_names.length > 0 ? (
                      user.role_names.map((role) => (
                        <Badge
                          key={role}
                          variant={
                            role.toLowerCase().includes("admin")
                              ? "success"
                              : "secondary"
                          }
                        >
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline">USER</Badge>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      isActive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {isActive ? "Hoạt động" : user.status || "Không hoạt động"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {isLogged ? (
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {formatLastLogin(user.last_login_at)}
                    </span>
                  ) : (
                    <span className="rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      Chưa đăng nhập
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
