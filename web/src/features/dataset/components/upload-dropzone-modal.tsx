"use client";

import { useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { BatchUploadResult } from "../types";
import { useUploadVersionAssetsMutation } from "../hooks";

interface UploadDropzoneModalProps {
  versionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UploadDropzoneModal({
  versionId,
  isOpen,
  onClose,
}: UploadDropzoneModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && (
        <UploadDropzoneContent versionId={versionId} onClose={onClose} />
      )}
    </Dialog>
  );
}

function UploadDropzoneContent({
  versionId,
  onClose,
}: {
  versionId: string;
  onClose: () => void;
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [resultReport, setResultReport] = useState<BatchUploadResult | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadVersionAssetsMutation(versionId);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  const handleUploadSubmit = () => {
    if (selectedFiles.length === 0) return;

    setErrorMsg(null);
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    uploadMutation.mutate(formData, {
      onSuccess: (res: BatchUploadResult) => {
        setResultReport(res);
        setSelectedFiles([]);
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || "Tải tập tin thất bại.";
        setErrorMsg(msg);
      },
    });
  };

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle>Tải lên tập tin dữ liệu (Batch Upload)</DialogTitle>
        <DialogDescription>
          Kéo thả hoặc chọn nhiều tệp tin (ảnh, PDF, video, audio) để tải lên
          phiên bản dữ liệu này.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {errorMsg && (
          <div className="rounded-md border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        {resultReport ? (
          <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-300">
            <h4 className="text-sm font-bold">✓ Tải lên thành công!</h4>
            <div className="space-y-1 text-xs">
              <p>
                • Tổng số tập tin xử lý:{" "}
                <strong>{resultReport.uploaded_assets.length}</strong>
              </p>
              <p>
                • Tập tin mới lưu trữ MinIO:{" "}
                <strong>{resultReport.new_assets_count}</strong>
              </p>
              <p>
                • Tập tin trùng lặp SHA256 (Deduplicated):{" "}
                <strong>{resultReport.reused_assets_count}</strong>
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setResultReport(null)}
              className="mt-2 text-xs"
            >
              + Tải thêm tập tin khác
            </Button>
          </div>
        ) : (
          <>
            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                isDragging
                  ? "border-primary-500 bg-primary-500/5"
                  : "border-slate-300 hover:border-slate-400 dark:border-slate-700"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <div className="space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl font-bold text-slate-500 dark:bg-slate-800">
                  📁
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Kéo & thả nhiều tập tin vào đây, hoặc{" "}
                  <span className="text-primary-600 underline">
                    duyệt từ máy tính
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  Hỗ trợ PNG, JPG, PDF, MP4, CSV, ZIP... (Tự động lọc SHA256
                  trùng lặp)
                </p>
              </div>
            </div>

            {/* Selected File Queue List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Đã chọn {selectedFiles.length} tập tin (
                    {formatSize(totalSize)})
                  </span>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-rose-500 hover:underline"
                  >
                    Xóa tất cả
                  </button>
                </div>

                <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-slate-100 p-2 pr-1 dark:border-slate-800">
                  {selectedFiles.map((f, idx) => (
                    <div
                      key={`${f.name}-${idx}`}
                      className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="truncate font-mono text-slate-700 dark:text-slate-300">
                          {f.name}
                        </span>
                        <span className="shrink-0 text-slate-400">
                          ({formatSize(f.size)})
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(idx)}
                        className="ml-2 text-slate-400 hover:text-rose-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={uploadMutation.isPending}
        >
          {resultReport ? "Đóng" : "Hủy"}
        </Button>

        {!resultReport && (
          <Button
            onClick={handleUploadSubmit}
            isLoading={uploadMutation.isPending}
            disabled={selectedFiles.length === 0}
          >
            Tải lên{" "}
            {selectedFiles.length > 0 ? `(${selectedFiles.length} tệp)` : ""}
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
