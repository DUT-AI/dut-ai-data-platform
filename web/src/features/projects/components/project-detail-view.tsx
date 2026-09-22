"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  FolderKanban,
  Layers3,
  Settings,
  Users,
} from "lucide-react";
import { Badge, Button, EmptyState } from "@/components/ui";
import { DatasetListView } from "@/features/dataset";
import { OntologyListView } from "@/features/ontology";
import { useProjectQuery } from "../hooks";
import { ProjectMembersTab } from "./project-members-tab";
import { ProjectOverviewTab } from "./project-overview-tab";
import { ProjectSettingsTab } from "./project-settings-tab";

type TabType = "overview" | "datasets" | "ontology" | "members" | "settings";

const TABS: Array<{
  key: TabType;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: "overview", label: "Tổng quan", icon: FolderKanban },
  { key: "datasets", label: "Tập dữ liệu", icon: Database },
  { key: "ontology", label: "Ontology", icon: Layers3 },
  { key: "members", label: "Thành viên", icon: Users },
  { key: "settings", label: "Cài đặt", icon: Settings },
];

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data: project,
    isLoading,
    error,
    refetch,
  } = useProjectQuery(projectId);
  const requestedTab = searchParams.get("tab");
  const activeTab: TabType = TABS.some((tab) => tab.key === requestedTab)
    ? (requestedTab as TabType)
    : "overview";

  const changeTab = (tab: TabType) => {
    const href =
      tab === "overview"
        ? `/projects/${projectId}`
        : `/projects/${projectId}?tab=${tab}`;
    router.replace(href, { scroll: false });
  };

  if (isLoading) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Đang tải dự án">
        <div className="h-36 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-72 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <EmptyState
        title="Không thể mở project"
        description="Project không tồn tại, bạn không có quyền truy cập hoặc API đang tạm thời gián đoạn."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Thử lại
            </Button>
            <Button asChild>
              <Link href="/projects">Về danh sách project</Link>
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 sm:p-6">
        <Link
          href="/projects"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-blue-700 transition-colors duration-150 hover:text-blue-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Danh sách project
        </Link>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                {project.name}
              </h1>
              <Badge
                variant={project.status === "active" ? "success" : "neutral"}
              >
                {project.status === "active" && (
                  <CheckCircle2
                    className="mr-1 h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                )}
                {project.status === "active" ? "Hoạt động" : "Đã lưu trữ"}
              </Badge>
              {project.project_type && (
                <Badge variant="info">{project.project_type}</Badge>
              )}
            </div>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">
              {project.description ||
                "Project chưa có mô tả. Cập nhật ở tab Cài đặt để thành viên hiểu rõ bài toán AI và mục tiêu dữ liệu."}
            </p>
          </div>
          <span className="data-mono max-w-full truncate rounded-lg border border-blue-200 bg-white/80 px-3 py-2 text-[11px] text-slate-600">
            {project.id}
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Nội dung project"
          className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-blue-200 bg-white/90 p-1.5"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => changeTab(tab.key)}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors duration-150 ${
                  selected
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-transparent text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <div role="tabpanel">
        {activeTab === "overview" && <ProjectOverviewTab project={project} />}
        {activeTab === "datasets" && <DatasetListView projectId={projectId} />}
        {activeTab === "ontology" && <OntologyListView projectId={projectId} />}
        {activeTab === "members" && <ProjectMembersTab projectId={projectId} />}
        {activeTab === "settings" && <ProjectSettingsTab project={project} />}
      </div>
    </div>
  );
}
