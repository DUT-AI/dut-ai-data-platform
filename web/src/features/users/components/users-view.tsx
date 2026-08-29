"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { useUsersQuery } from "../hooks/use-users";
import { UserListTable } from "./user-list-table";

const PAGE_SIZE = 20;

export function UsersView() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input by 350ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 350);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data, isLoading, isError, refetch } = useUsersQuery({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const users = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Người dùng
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Danh sách người dùng và thời điểm đăng nhập gần nhất vào Data Platform.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <CardTitle className="text-base font-semibold">
            Danh sách người dùng ({total})
          </CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Tìm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <UserListTable
            users={users}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
          />

          {/* Pagination Footer */}
          {!isLoading && !isError && total > 0 && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 sm:flex-row dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Hiển thị {users.length} trên tổng số {total} người dùng
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="px-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  Trang {page} / {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
