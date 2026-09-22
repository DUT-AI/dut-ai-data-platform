"use client";

import React, { useState } from "react";
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
import { Dataset } from "../types";
import {
  useCreateDatasetMutation,
  useProjectDatasetsQuery,
  useUpdateDatasetMutation,
} from "../hooks";
import { DatasetVersionView } from "./dataset-version-view";

interface DatasetListViewProps {
  projectId: string;
}

export function DatasetListView({ projectId }: DatasetListViewProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(
    null
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Dataset Modal state
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const { data: datasets, isLoading } = useProjectDatasetsQuery(projectId);
  const createMutation = useCreateDatasetMutation(projectId);
  const updateMutation = useUpdateDatasetMutation(
    editingDataset?.id || "",
    projectId
  );

  const activeDataset = datasets?.find(
    (d: Dataset) => d.id === selectedDatasetId
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setErrorMsg(null);
    createMutation.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: (created: Dataset) => {
          setName("");
          setDescription("");
          setIsCreateOpen(false);
          setSelectedDatasetId(created.id);
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { detail?: string } } })?.response
              ?.data?.detail || "Không thể tạo Dataset.";
          setErrorMsg(msg);
        },
      }
    );
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editingDataset) return;

    updateMutation.mutate(
      {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      },
      {
        onSuccess: () => {
          setEditingDataset(null);
        },
      }
    );
  };

  if (activeDataset) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedDatasetId(null)}
          className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-slate-100"
        >
          ← Quay lại danh sách Datasets
        </button>

        <DatasetVersionView dataset={activeDataset} projectId={projectId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Bộ Dữ Liệu Datasets ({datasets?.length || 0})</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Quản lý danh sách tập tin dữ liệu thô, phiên bản lưu trữ và
              deduplicate SHA256.
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} size="sm">
            + Tạo Dataset mới
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Đang tải danh sách Datasets...
            </div>
          ) : !datasets || datasets.length === 0 ? (
            <div className="space-y-3 p-12 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Chưa có Dataset nào được tạo
              </p>
              <p className="mx-auto max-w-sm text-xs text-slate-500">
                Tạo một Dataset để bắt đầu tải lên tập tin ảnh, video, PDF hay
                audio cho gán nhãn viên.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} size="sm">
                Tạo Dataset đầu tiên
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {datasets.map((dataset: Dataset) => (
                <div
                  key={dataset.id}
                  className="hover:border-primary-500/50 flex cursor-pointer flex-col justify-between space-y-3 rounded-xl border border-slate-200 bg-white p-4 transition-[border-color,box-shadow] duration-150 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div
                    onClick={() => setSelectedDatasetId(dataset.id)}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {dataset.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDataset(dataset);
                            setEditName(dataset.name);
                            setEditDescription(dataset.description || "");
                          }}
                          title="Chỉnh sửa Dataset"
                          className="flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                          <span>Sửa</span>
                        </button>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {dataset.versions?.length || 1} versions
                        </span>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-500">
                      {dataset.description || "Chưa có mô tả."}
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedDatasetId(dataset.id)}
                    className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-400 dark:border-slate-800"
                  >
                    <span>
                      Tạo ngày:{" "}
                      {dataset.created_at
                        ? new Date(dataset.created_at).toLocaleDateString(
                            "vi-VN"
                          )
                        : "N/A"}
                    </span>
                    <span className="text-primary-600 dark:text-primary-400 font-semibold">
                      Mở quản lý dữ liệu →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dataset Modal */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => !open && setIsCreateOpen(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo bộ Dữ liệu Dataset mới</DialogTitle>
            <DialogDescription>
              Khởi tạo một Dataset và phiên bản nháp mặc định (v1.0.0).
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
                Tên Dataset <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="VD: Dữ liệu ảnh xe ô tô camera giao thông"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Mô tả
              </label>
              <textarea
                placeholder="Mô tả nguồn dữ liệu và mục đích huấn luyện..."
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(e.target.value)
                }
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
                Khởi tạo Dataset
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dataset Modal */}
      <Dialog
        open={Boolean(editingDataset)}
        onOpenChange={(open) => !open && setEditingDataset(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa bộ Dữ liệu Dataset</DialogTitle>
            <DialogDescription>
              Cập nhật tên hiển thị và mô tả thông tin cho Dataset.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Tên Dataset <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="VD: Dữ liệu ảnh xe ô tô"
                value={editName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditName(e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Mô tả
              </label>
              <textarea
                placeholder="Mô tả mục đích dữ liệu..."
                value={editDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditDescription(e.target.value)
                }
                rows={3}
                className="focus:ring-primary-500 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingDataset(null)}
                disabled={updateMutation.isPending}
              >
                Hủy
              </Button>
              <Button type="submit" isLoading={updateMutation.isPending}>
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
