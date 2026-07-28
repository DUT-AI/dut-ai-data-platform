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
          className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
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
            <p className="text-xs text-slate-500 mt-1">
              Quản lý cấu trúc danh mục nhãn và các trường thuộc tính quy định cho dữ liệu dự án.
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
            <div className="p-12 text-center space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Chưa có Ontology nào được khởi tạo
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tạo một bộ Ontology để bắt đầu định nghĩa các nhãn (Categories) và thuộc tính (Attributes) cho gán nhãn viên.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} size="sm">
                Tạo Ontology đầu tiên
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ontologies.map((onto) => (
                <div
                  key={onto.id}
                  onClick={() => setSelectedOntologyId(onto.id)}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                        {onto.name}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {onto.versions?.length || 1} versions
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {onto.description || "Chưa có mô tả."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                    <span>
                      Tạo ngày:{" "}
                      {onto.created_at
                        ? new Date(onto.created_at).toLocaleDateString("vi-VN")
                        : "N/A"}
                    </span>
                    <span className="font-semibold text-primary-600 dark:text-primary-400">
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
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && setIsCreateOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo bộ Nhãn Ontology mới</DialogTitle>
            <DialogDescription>
              Khởi tạo một bộ nhãn mở rộng và phiên bản nháp mặc định (v1.0.0).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            {errorMsg && (
              <div className="p-3 text-xs rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
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
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
