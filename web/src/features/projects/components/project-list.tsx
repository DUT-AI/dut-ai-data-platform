"use client";

import { useState, useMemo } from "react";
import { Plus, Search, FolderKanban, Filter, RefreshCw } from "lucide-react";
import { useProjectsQuery } from "../hooks";
import { PROJECT_TYPE_OPTIONS } from "../types";
import { ProjectCard } from "./project-card";
import { CreateProjectModal } from "./create-project-modal";
import { Button, Input } from "@/components/ui";

export function ProjectList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const {
    data: projects = [],
    isLoading,
    isError,
    refetch,
  } = useProjectsQuery();

  // Filter projects by search query and AI type
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description &&
          project.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()));

      const matchesType =
        selectedType === "all" || project.project_type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [projects, searchQuery, selectedType]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            <FolderKanban className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            Quản lý Dự án AI
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Quản lý không gian gán nhãn, tập dữ liệu và các tác vụ huấn luyện AI
            của bạn.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white shadow-md hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          Tạo dự án mới
        </Button>
      </div>

      {/* Toolbar & Filters */}
      <div className="shadow-xs flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Tìm kiếm dự án theo tên hoặc mô tả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-50 pl-9 dark:bg-slate-800/50"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-4 w-4 shrink-0 text-slate-400" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">Tất cả loại dự án ({projects.length})</option>
            {PROJECT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            title="Làm mới danh sách"
            className="h-9 w-9 border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Grid View */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/50 p-10 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
            Không thể tải danh sách dự án từ máy chủ.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Vui lòng kiểm tra kết nối API Backend hoặc thử làm mới lại trang.
          </p>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="mt-4 border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/50"
          >
            Thử lại
          </Button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <FolderKanban className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
            {searchQuery || selectedType !== "all"
              ? "Không tìm thấy dự án phù hợp"
              : "Chưa có dự án nào"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {searchQuery || selectedType !== "all"
              ? "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc loại tác vụ AI."
              : "Bắt đầu tạo dự án AI đầu tiên của bạn để gán nhãn dữ liệu."}
          </p>
          {!searchQuery && selectedType === "all" && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-5 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Tạo dự án ngay
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Modal tạo dự án */}
      <CreateProjectModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
