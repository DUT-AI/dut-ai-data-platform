"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { Project } from "../types/project";
import {
  useProjectConfigQuery,
  useUpdateConfigMutation,
  useUpdateProjectMutation,
} from "../hooks/use-projects";

interface ProjectSettingsTabProps {
  project: Project;
}

export function ProjectSettingsTab({ project }: ProjectSettingsTabProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [jsonText, setJsonText] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [infoSuccess, setInfoSuccess] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  const updateProjectMutation = useUpdateProjectMutation(project.id);
  const { data: configData, isLoading: isConfigLoading } = useProjectConfigQuery(
    project.id
  );
  const updateConfigMutation = useUpdateConfigMutation(project.id);

  const currentJsonText =
    jsonText ?? JSON.stringify(configData?.settings || {}, null, 2);

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInfoSuccess(false);
    updateProjectMutation.mutate(
      { name, description },
      {
        onSuccess: () => {
          setInfoSuccess(true);
          setTimeout(() => setInfoSuccess(false), 3000);
        },
      }
    );
  };

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError(null);
    setConfigSuccess(false);

    try {
      const parsed = JSON.parse(currentJsonText);
      updateConfigMutation.mutate(parsed, {
        onSuccess: () => {
          setConfigSuccess(true);
          setTimeout(() => setConfigSuccess(false), 3000);
        },
      });
    } catch {
      setJsonError("Định dạng JSON không hợp lệ. Vui lòng kiểm tra lại cấu trúc cú pháp.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Basic Info Edit Card */}
      <Card>
        <CardHeader>
          <CardTitle>Cập nhật thông tin dự án</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInfoSubmit} className="space-y-4">
            {infoSuccess && (
              <div className="p-3 text-xs rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Đã lưu thông tin dự án thành công!
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Tên dự án <span className="text-rose-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Mô tả dự án
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" isLoading={updateProjectMutation.isPending}>
                Lưu thay đổi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* JSONB Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Cấu hình mở rộng (JSON Settings)</CardTitle>
        </CardHeader>
        <CardContent>
          {isConfigLoading ? (
            <div className="p-4 text-center text-sm text-slate-500">
              Đang tải cấu hình...
            </div>
          ) : (
            <form onSubmit={handleConfigSubmit} className="space-y-4">
              {configSuccess && (
                <div className="p-3 text-xs rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Đã cập nhật cấu hình JSON thành công!
                </div>
              )}
              {jsonError && (
                <div className="p-3 text-xs rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  {jsonError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Settings Payload (JSONB)
                </label>
                <textarea
                  value={currentJsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  rows={8}
                  className="w-full font-mono text-xs p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-950 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" isLoading={updateConfigMutation.isPending}>
                  Lưu cấu hình JSON
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
