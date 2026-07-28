import Link from "next/link";
import { LayoutDashboard, Settings } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 md:block">
        <Link
          href="/dashboard"
          className="block text-lg font-semibold text-slate-950"
        >
          Project Boilerplate
        </Link>
        <nav className="mt-8 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700"
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
          <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100">
            <Settings size={18} />
            Settings
          </button>
        </nav>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">
              Frontend Boilerplate
            </p>
            <Link href="/" className="text-sm font-medium text-blue-700">
              Home
            </Link>
          </div>
        </header>
        <main className="px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
