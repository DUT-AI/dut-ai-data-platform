"use client";

import Link from "next/link";
import {
  ArrowRight,
  Archive,
  CheckCircle2,
  FolderKanban,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Avatar, Badge, Button, EmptyState, Notice } from "@/components/ui";
import { useUserQuery } from "@/features/auth";
import { useProjectsQuery } from "@/features/projects/hooks";

function greetingName(name?: string): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.length > 1 ? parts.slice(-2).join(" ") : parts[0] || "bạn";
}

function formatDate(value?: string | null): string {
  if (!value) return "Chưa ghi nhận";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function DashboardOverview() {
  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
    refetch: refetchUser,
  } = useUserQuery();
  const {
    data: projects = [],
    isLoading: isProjectsLoading,
    isError: isProjectsError,
    refetch: refetchProjects,
  } = useProjectsQuery();

  const activeProjects = projects.filter(
    (project) => project.status === "active"
  );
  const archivedProjects = projects.length - activeProjects.length;
  const recentProjects = [...activeProjects]
    .sort((left, right) =>
      (right.updated_at || right.created_at || "").localeCompare(
        left.updated_at || left.created_at || ""
      )
    )
    .slice(0, 5);

  if (isUserLoading || isProjectsLoading) {
    return (
      <div
        className="space-y-6"
        aria-busy="true"
        aria-label="Đang tải dashboard"
      >
        <div className="h-56 animate-pulse rounded-xl bg-blue-100" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl bg-slate-200"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isUserError) {
    return (
      <Notice tone="danger" title="Không thể tải hồ sơ" className="max-w-2xl">
        <p>
          Phiên đăng nhập có thể đã hết hạn hoặc Auth Service chưa sẵn sàng.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => refetchUser()}
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Thử lại
        </Button>
      </Notice>
    );
  }

  return (
    <div className="space-y-7">
      <header className="overflow-hidden rounded-xl border border-blue-700 bg-blue-600 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-100">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Trung tâm công việc cá nhân
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Chào {greetingName(user?.name)}
            </h1>
            <p className="mt-3 text-sm leading-6 text-blue-50 sm:text-base">
              Tiếp tục từ các project đang hoạt động và theo dõi đúng contract
              dữ liệu trước khi gán nhãn.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 p-3">
            <Avatar
              name={user?.name || user?.email || "User"}
              avatarUrl={user?.avatar_url}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {user?.name || "Người dùng DUT"}
              </p>
              <p className="truncate text-xs text-blue-100">{user?.email}</p>
            </div>
          </div>
        </div>
      </header>

      {isProjectsError && (
        <Notice tone="danger" title="Chưa thể đọc danh sách dự án">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              API project không phản hồi. Hồ sơ đăng nhập vẫn đang hoạt động.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchProjects()}
            >
              Thử lại
            </Button>
          </div>
        </Notice>
      )}

      <section aria-labelledby="account-summary-title">
        <div className="mb-3">
          <h2
            id="account-summary-title"
            className="text-sm font-bold text-slate-950"
          >
            Phạm vi làm việc hiện tại
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Dữ liệu trực tiếp từ hồ sơ và danh sách project bạn được phép truy
            cập.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Project đang hoạt động"
            value={String(activeProjects.length)}
            detail="Sẵn sàng để mở và tiếp tục"
            icon={FolderKanban}
            tone="text-blue-700"
          />
          <Metric
            label="Project đã lưu trữ"
            value={String(archivedProjects)}
            detail="Không nằm trong luồng xử lý chính"
            icon={Archive}
            tone="text-slate-600"
          />
          <Metric
            label="Trạng thái tài khoản"
            value={user?.status || "Không rõ"}
            detail={user?.role_names?.join(", ") || "Chưa có vai trò hệ thống"}
            icon={
              user?.status?.toUpperCase() === "ACTIVE"
                ? CheckCircle2
                : ShieldCheck
            }
            tone="text-emerald-700"
          />
        </div>
      </section>

      <section
        className="data-panel overflow-hidden"
        aria-labelledby="recent-projects-title"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2
              id="recent-projects-title"
              className="text-sm font-bold text-slate-950"
            >
              Project gần đây
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Mở project để xem dataset version, ontology và công việc gán nhãn.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/projects">
              Tất cả project
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {recentProjects.length === 0 ? (
          <EmptyState
            className="m-5"
            title="Chưa có project đang hoạt động"
            description="Tạo project mới hoặc khôi phục một project đã lưu trữ để bắt đầu làm việc."
            action={
              <Button asChild>
                <Link href="/projects/new">Tạo project</Link>
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <FolderKanban className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="truncate text-sm font-bold hover:text-blue-700"
                    >
                      {project.name}
                    </Link>
                    <Badge variant="success">Hoạt động</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    Cập nhật{" "}
                    {formatDate(project.updated_at || project.created_at)}
                    {project.template_id
                      ? ` · Template ${project.template_id}`
                      : ""}
                  </p>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="justify-start text-blue-700"
                >
                  <Link href={`/projects/${project.id}`}>
                    Mở workspace
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof FolderKanban;
  tone: string;
}) {
  return (
    <article className="data-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
      </div>
      <p className="mt-2 break-words text-2xl font-bold text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}
