"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { PROJECT_TYPE_OPTIONS, Project } from "../types/project";
import { useArchiveProjectMutation } from "../hooks/use-projects";

interface ProjectOverviewTabProps {
  project: Project;
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const archiveMutation = useArchiveProjectMutation(project.id);
  const typeOption = PROJECT_TYPE_OPTIONS.find(
    (opt) => opt.value === project.project_type
  );

  const handleArchive = () => {
    if (
      confirm(
        `Bạn có chắc chắn muốn lưu trữ (Archive) dự án "${project.name}"?`
      )
    ) {
      archiveMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Thông tin tổng quan</CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant={project.status === "active" ? "success" : "secondary"}
              >
                {project.status.toUpperCase()}
              </Badge>
              {typeOption && (
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeOption.badgeColor}`}
                >
                  {typeOption.label}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Mô tả dự án
            </span>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              {project.description || "Chưa có mô tả cho dự án này."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-2 md:grid-cols-3 dark:border-slate-800">
            <div>
              <span className="text-xs text-slate-500">Project ID</span>
              <p className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                {project.id}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Chủ sở hữu (Owner)</span>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                User #{project.created_by}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Ngày tạo</span>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {project.created_at
                  ? new Date(project.created_at).toLocaleDateString("vi-VN")
                  : "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="from-primary-500/10 to-primary-600/5 border-primary-500/20 bg-gradient-to-br">
          <CardContent className="p-4">
            <span className="text-primary-600 dark:text-primary-400 text-xs font-medium uppercase">
              Tổng số Data Items
            </span>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              0
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="p-4">
            <span className="text-xs font-medium uppercase text-purple-600 dark:text-purple-400">
              Ontologies / NHÃN
            </span>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              0
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
          <CardContent className="p-4">
            <span className="text-xs font-medium uppercase text-emerald-600 dark:text-emerald-400">
              Tiến độ gán nhãn
            </span>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              0%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {project.status === "active" && (
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <h4 className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                Lưu trữ dự án (Archive)
              </h4>
              <p className="text-xs text-slate-500">
                Chuyển dự án sang trạng thái Đã lưu trữ. Bạn có thể mở lại bất
                cứ lúc nào.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleArchive}
              isLoading={archiveMutation.isPending}
            >
              Lưu trữ dự án
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
