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

interface ProjectDetailViewProps {
  projectId: string;
}

type TabType = "overview" | "ontologies" | "members" | "settings";

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const { data: project, isLoading, error } = useProjectQuery(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Đang tải dữ liệu dự án...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md space-y-4">
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
      <div className="space-y-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          ← Quay lại danh sách projects
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <p className="text-sm text-slate-500 mt-1">
              {project.description || "Chưa có mô tả."}
            </p>
          </div>

          {typeOption && (
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full border self-start md:self-auto ${typeOption.badgeColor}`}
            >
              {typeOption.label}
            </span>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 pt-4">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            Tổng quan (Overview)
          </button>
          <button
            onClick={() => setActiveTab("ontologies")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "ontologies"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            Ontologies (Bộ Nhãn)
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "members"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            Thành viên (Members)
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
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
      {activeTab === "ontologies" && <OntologyListView projectId={projectId} />}
      {activeTab === "members" && <ProjectMembersTab projectId={projectId} />}
      {activeTab === "settings" && <ProjectSettingsTab project={project} />}
    </div>
  );
}
