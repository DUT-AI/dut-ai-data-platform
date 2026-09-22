"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, ConfirmDialog } from "@/components/ui";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    href: "/projects",
    label: "Dự án AI",
    icon: FolderKanban,
  },
  {
    href: "/users",
    label: "Người dùng",
    icon: Users,
  },
];

function formatRoleName(role?: string): string {
  if (!role) return "Thành viên";
  const upper = role.toUpperCase();
  if (upper === "ADMIN") return "Quản trị viên";
  if (upper === "MANAGER") return "Quản lý";
  if (upper === "ANNOTATOR") return "Người gán nhãn";
  if (upper === "REVIEWER") return "Người kiểm duyệt";
  return role;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isAnnotateScreen = pathname?.includes("/annotate/");
  const isNewProjectScreen = pathname === "/projects/new";
  if (isAnnotateScreen || isNewProjectScreen) {
    return <>{children}</>;
  }

  const breadcrumbs = pathname?.startsWith("/projects/") ? (
    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <Link
        href="/projects"
        className="font-medium transition-colors duration-150 hover:text-blue-600 dark:hover:text-blue-400"
      >
        Dự án
      </Link>
      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
      <span className="max-w-[180px] truncate font-semibold text-slate-900 sm:max-w-[360px] dark:text-slate-100">
        Chi tiết dự án
      </span>
    </div>
  ) : (
    <span className="font-semibold text-slate-800 dark:text-slate-200">
      {pathname === "/projects"
        ? "Không gian dự án"
        : pathname === "/users"
          ? "Quản trị người dùng"
          : "Trung tâm công việc"}
    </span>
  );

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="shadow-xs flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">
            DUT AI Platform
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Data &amp; Labeling Studio
          </p>
        </div>
        <button
          type="button"
          aria-label="Đóng menu"
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 lg:hidden dark:hover:bg-slate-800 dark:hover:text-slate-200"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav
        aria-label="Điều hướng chính"
        className="flex-1 space-y-1 overflow-y-auto p-3"
      >
        <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Không gian làm việc
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/projects" && pathname?.startsWith("/projects/"));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex min-h-[44px] items-center justify-between rounded-lg border px-3 text-xs font-semibold transition-colors duration-150 ${
                isActive
                  ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300"
                  : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon
                  className={`h-4 w-4 ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-400"
                  }`}
                />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
          <Avatar
            name={user?.name || user?.email || "User"}
            avatarUrl={user?.avatar_url}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              {user?.name || user?.email || "Người dùng"}
            </p>
            <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
              {formatRoleName(user?.role_names?.[0])}
            </p>
          </div>
          <button
            type="button"
            aria-label="Đăng xuất"
            onClick={() => setIsLogoutOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 antialiased dark:bg-slate-950 dark:text-slate-50">
      {/* Desktop Persistent Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex dark:border-slate-800 dark:bg-slate-900">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setMobileOpen(false);
            }
          }}
        >
          <aside className="flex h-full w-[min(86vw,320px)] flex-col bg-white shadow-2xl dark:bg-slate-900">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="min-w-0 lg:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            {breadcrumbs}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 sm:inline-flex dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Đã xác thực tài khoản DUT
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <ConfirmDialog
        open={isLogoutOpen}
        title="Xác nhận đăng xuất"
        description="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản DUT AI Data Platform?"
        confirmLabel="Đăng xuất"
        cancelLabel="Huỷ"
        destructive
        isLoading={isLoggingOut}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={async () => {
          setIsLoggingOut(true);
          try {
            await logout();
          } finally {
            setIsLoggingOut(false);
            setIsLogoutOpen(false);
          }
        }}
      />
    </div>
  );
}
