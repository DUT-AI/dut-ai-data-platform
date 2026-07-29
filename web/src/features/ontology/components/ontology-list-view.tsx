"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/components/ui";
import { Ontology } from "../types/ontology";
import {
  useCreateOntologyMutation,
  useProjectOntologiesQuery,
} from "../hooks/use-ontologies";
import { OntologyEditorView } from "./ontology-editor-view";

interface OntologyListViewProps {
  projectId: string;
}

export function OntologyListView({ projectId }: OntologyListViewProps) {
  const [selectedOntologyId, setSelectedOntologyId] = useState<string | null>(
    null
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: ontologies, isLoading } = useProjectOntologiesQuery(projectId);
  const createMutation = useCreateOntologyMutation(projectId);

  const activeOntology = ontologies?.find((o) => o.id === selectedOntologyId);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setErrorMsg(null);
    createMutation.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: (created: Ontology) => {
          setName("");
          setDescription("");
          setIsCreateOpen(false);
          setSelectedOntologyId(created.id);
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { detail?: string } } })?.response
              ?.data?.detail || "Không thể tạo Ontology.";
          setErrorMsg(msg);
        },
      }
    );
  };

  if (activeOntology) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedOntologyId(null)}
          className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-slate-100"
        >
          ← Quay lại danh sách Ontologies
        </button>

        <OntologyEditorView ontology={activeOntology} projectId={projectId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Bộ Nhãn Ontology ({ontologies?.length || 0})</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Quản lý cấu trúc danh mục nhãn và các trường thuộc tính quy định
              cho dữ liệu dự án.
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} size="sm">
            + Tạo Ontology mới
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Đang tải danh sách Ontologies...
            </div>
          ) : !ontologies || ontologies.length === 0 ? (
            <div className="space-y-3 p-12 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Chưa có Ontology nào được khởi tạo
              </p>
              <p className="mx-auto max-w-sm text-xs text-slate-500">
                Tạo một bộ Ontology để bắt đầu định nghĩa các nhãn (Categories)
                và thuộc tính (Attributes) cho gán nhãn viên.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} size="sm">
                Tạo Ontology đầu tiên
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {ontologies.map((onto) => (
                <div
                  key={onto.id}
                  onClick={() => setSelectedOntologyId(onto.id)}
                  className="hover:border-primary-500/50 flex cursor-pointer flex-col justify-between space-y-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {onto.name}
                      </h3>
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {onto.versions?.length || 1} versions
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-500">
                      {onto.description || "Chưa có mô tả."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-400 dark:border-slate-800">
                    <span>
                      Tạo ngày:{" "}
                      {onto.created_at
                        ? new Date(onto.created_at).toLocaleDateString("vi-VN")
                        : "N/A"}
                    </span>
                    <span className="text-primary-600 dark:text-primary-400 font-semibold">
                      Mở trình biên tập →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Ontology Modal */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => !open && setIsCreateOpen(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo bộ Nhãn Ontology mới</DialogTitle>
            <DialogDescription>
              Khởi tạo một bộ nhãn mở rộng và phiên bản nháp mặc định (v1.0.0).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            {errorMsg && (
              <div className="rounded-md border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Tên bộ Ontology <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="VD: Bộ Nhãn Nhận Diện Xe Cộ 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Mô tả
              </label>
              <textarea
                placeholder="Mô tả phạm vi ứng dụng của bộ nhãn này..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="focus:ring-primary-500 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={createMutation.isPending}
              >
                Hủy
              </Button>
              <Button type="submit" isLoading={createMutation.isPending}>
                Khởi tạo Ontology
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
