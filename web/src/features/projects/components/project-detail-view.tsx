"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { useProjectQuery } from "../hooks/use-projects";
import { PROJECT_TYPE_OPTIONS } from "../types/project";
import { ProjectOverviewTab } from "./project-overview-tab";
import { ProjectMembersTab } from "./project-members-tab";
import { ProjectSettingsTab } from "./project-settings-tab";
import { OntologyListView } from "@/features/ontology";
import { DatasetListView } from "@/features/dataset";

interface ProjectDetailViewProps {
  projectId: string;
}

type TabType = "overview" | "datasets" | "ontologies" | "members" | "settings";

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const { data: project, isLoading, error } = useProjectQuery(projectId);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="border-primary-500 mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-sm text-slate-500">Đang tải dữ liệu dự án...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md space-y-4 text-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Không tìm thấy dự án
          </h2>
          <p className="text-sm text-slate-500">
            Dự án không tồn tại hoặc bạn không có quyền truy cập.
          </p>
          <Link href="/projects">
            <Button variant="outline">Quay lại danh sách dự án</Button>
          </Link>
        </div>
      </div>
    );
  }

  const typeOption = PROJECT_TYPE_OPTIONS.find(
    (opt) => opt.value === project.project_type
  );

  return (
    <div className="space-y-6">
      {/* Header & Back Nav */}
      <div className="space-y-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-slate-100"
        >
          ← Quay lại danh sách projects
        </Link>

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {project.name}
              </h1>
              <Badge
                variant={project.status === "active" ? "success" : "secondary"}
              >
                {project.status.toUpperCase()}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {project.description || "Chưa có mô tả."}
            </p>
          </div>

          {typeOption && (
            <span
              className={`self-start rounded-full border px-3 py-1 text-xs font-semibold md:self-auto ${typeOption.badgeColor}`}
            >
              {typeOption.label}
            </span>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-6 border-b border-slate-200 pt-4 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            Tổng quan (Overview)
          </button>
          <button
            onClick={() => setActiveTab("datasets")}
            className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === "datasets"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            Datasets (Dữ liệu)
          </button>
          <button
            onClick={() => setActiveTab("ontologies")}
            className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === "ontologies"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            Ontologies (Bộ Nhãn)
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === "members"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            Thành viên (Members)
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === "settings"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            Cài đặt (Settings)
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "overview" && <ProjectOverviewTab project={project} />}
      {activeTab === "datasets" && <DatasetListView projectId={projectId} />}
      {activeTab === "ontologies" && <OntologyListView projectId={projectId} />}
      {activeTab === "members" && <ProjectMembersTab projectId={projectId} />}
      {activeTab === "settings" && <ProjectSettingsTab project={project} />}
    </div>
  );
}
