"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  Sparkles,
} from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAnnotateScreen = pathname?.includes("/annotate/");
  if (isAnnotateScreen) {
    return <>{children}</>;
  }

  const navItems = [
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
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 md:block dark:border-slate-800 dark:bg-slate-900">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-2 text-base font-bold text-slate-900 dark:text-slate-100"
        >
          <div className="shadow-xs flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <span>DUT AI Platform</span>
        </Link>

        <nav className="mt-8 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "shadow-2xs bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}

          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200">
            <Settings size={18} />
            Cài đặt
          </button>
        </nav>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 px-6 py-3.5 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Nền tảng Gán nhãn & Xử lý Dữ liệu AI
            </p>
            <Link
              href="/projects"
              className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Danh sách Dự án
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
