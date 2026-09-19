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
import { useUploadManager } from "@/contexts/upload-context";

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [corruptedFileNames, setCorruptedFileNames] = useState<Set<string>>(
    new Set()
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { startBackgroundUpload } = useUploadManager();

  const validateImageFile = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const isImg =
        file.type.startsWith("image/") ||
        /\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(file.name);
      if (!isImg) {
        resolve(true);
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(true);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };
      img.src = url;
    });
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...newFiles]);

    // Check images in background
    for (const f of newFiles) {
      const isValid = await validateImageFile(f);
      if (!isValid) {
        setCorruptedFileNames((prev) => new Set(prev).add(f.name));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = selectedFiles[index];
    if (fileToRemove) {
      setCorruptedFileNames((prev) => {
        const next = new Set(prev);
        next.delete(fileToRemove.name);
        return next;
      });
    }
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

    if (corruptedFileNames.size > 0) {
      setErrorMsg(
        `Có ${corruptedFileNames.size} tập tin ảnh bị hỏng (${Array.from(corruptedFileNames).join(", ")}). Vui lòng xóa tệp bị hỏng trước khi tải lên.`
      );
      return;
    }

    setErrorMsg(null);
    startBackgroundUpload(versionId, selectedFiles);
    onClose();
  };

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle>Tải lên tập tin dữ liệu (Batch Upload)</DialogTitle>
        <DialogDescription>
          Kéo thả hoặc chọn nhiều tệp tin (ảnh, PDF, video, audio) để tải lên.
          Tập tin sẽ được tải trực tiếp ở chế độ nền.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {errorMsg && (
          <div className="rounded-md border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

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
              Hỗ trợ PNG, JPG, PDF, MP4, CSV, ZIP... (Tự động tải ngầm ở nền không khóa giao diện)
            </p>
          </div>
        </div>

        {/* Selected File Queue List */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Đã chọn {selectedFiles.length} tập tin ({formatSize(totalSize)})
              </span>
              <button
                onClick={() => setSelectedFiles([])}
                className="text-rose-500 hover:underline"
              >
                Xóa tất cả
              </button>
            </div>

            <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-slate-100 p-2 pr-1 dark:border-slate-800">
              {selectedFiles.map((f, idx) => {
                const isCorrupted = corruptedFileNames.has(f.name);
                return (
                  <div
                    key={`${f.name}-${idx}`}
                    className={`flex items-center justify-between rounded border p-2 text-xs transition-colors ${
                      isCorrupted
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="truncate font-mono font-medium">
                        {f.name}
                      </span>
                      <span className="shrink-0 text-slate-400">
                        ({formatSize(f.size)})
                      </span>
                      {isCorrupted && (
                        <span className="shrink-0 rounded bg-rose-500/20 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                          ⚠️ Ảnh bị hỏng
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="ml-2 text-slate-400 hover:text-rose-500"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>

        <Button
          onClick={handleUploadSubmit}
          disabled={selectedFiles.length === 0}
        >
          🚀 Tải lên ở nền ({selectedFiles.length} tệp)
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}


