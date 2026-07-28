"use client";

import { useState } from "react";
import { Plus, Check, Loader2 } from "lucide-react";
import { useCreateProjectMutation } from "../hooks/use-projects";
import { PROJECT_TYPE_OPTIONS, ProjectType } from "../types/project";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
} from "@/components/ui";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectModal({
  open,
  onOpenChange,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("detection");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = useCreateProjectMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Vui lòng nhập tên dự án.");
      return;
    }

    setErrorMsg(null);
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        project_type: projectType,
      });

      // Reset & Close
      setName("");
      setDescription("");
      setProjectType("detection");
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Không thể tạo dự án. Vui lòng thử lại.";
      setErrorMsg(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Tạo dự án AI mới
          </DialogTitle>
          <DialogDescription>
            Khởi tạo không gian gán nhãn và xử lý dữ liệu AI cho đội ngũ của bạn.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {errorMsg && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-medium text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          {/* Tên dự án */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tên dự án <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="VD: Dự án Nhận diện Biển số xe..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/50"
              required
            />
          </div>

          {/* Loại dự án AI */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Loại tác vụ AI / Gán nhãn <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {PROJECT_TYPE_OPTIONS.map((opt) => {
                const isSelected = projectType === opt.value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setProjectType(opt.value)}
                    className={`relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20 dark:border-blue-500 dark:bg-blue-950/30"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {opt.label}
                      </span>
                      {isSelected && (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white dark:bg-blue-500">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mô tả dự án */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Mô tả dự án (Tùy chọn)
            </label>
            <textarea
              rows={3}
              placeholder="Mô tả mục tiêu dự án, nguồn dữ liệu hoặc ghi chú..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-blue-500"
            />
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
              className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang khởi tạo...
                </>
              ) : (
                "Tạo dự án"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
