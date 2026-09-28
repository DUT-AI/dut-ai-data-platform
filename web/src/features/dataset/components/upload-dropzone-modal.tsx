"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  FileText,
  Headphones,
  Image as ImageIcon,
  Layers,
  Table as TableIcon,
  UploadCloud,
  Video,
  X,
} from "lucide-react";

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
import { resolveModalityMeta, validateFileForModality } from "../utils/modality";

interface UploadDropzoneModalProps {
  versionId: string;
  isOpen: boolean;
  onClose: () => void;
  modality?: string;
  templateTitle?: string;
  templateGroup?: string;
}

export function UploadDropzoneModal({
  versionId,
  isOpen,
  onClose,
  modality,
  templateTitle,
  templateGroup,
}: UploadDropzoneModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && (
        <UploadDropzoneContent
          versionId={versionId}
          onClose={onClose}
          modality={modality}
          templateTitle={templateTitle}
          templateGroup={templateGroup}
        />
      )}
    </Dialog>
  );
}

function UploadDropzoneContent({
  versionId,
  onClose,
  modality,
  templateTitle,
  templateGroup,
}: {
  versionId: string;
  onClose: () => void;
  modality?: string;
  templateTitle?: string;
  templateGroup?: string;
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [corruptedFileNames, setCorruptedFileNames] = useState<Set<string>>(
    new Set()
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { startBackgroundUpload } = useUploadManager();

  const modalityMeta = useMemo(
    () => resolveModalityMeta(modality, templateGroup),
    [modality, templateGroup]
  );

  const renderModalityIcon = (iconName: string, className = "h-5 w-5") => {
    switch (iconName) {
      case "image":
        return <ImageIcon className={className} aria-hidden="true" />;
      case "file-text":
        return <FileText className={className} aria-hidden="true" />;
      case "headphones":
        return <Headphones className={className} aria-hidden="true" />;
      case "video":
        return <Video className={className} aria-hidden="true" />;
      case "table":
        return <TableIcon className={className} aria-hidden="true" />;
      default:
        return <Layers className={className} aria-hidden="true" />;
    }
  };

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
    const validFiles: File[] = [];
    const rejectedFiles: string[] = [];

    for (const f of newFiles) {
      const result = validateFileForModality(f, modalityMeta);
      if (result.valid) {
        validFiles.push(f);
      } else {
        rejectedFiles.push(f.name);
      }
    }

    if (rejectedFiles.length > 0) {
      const names = rejectedFiles.slice(0, 3).join(", ");
      const extra =
        rejectedFiles.length > 3
          ? ` và ${rejectedFiles.length - 3} tệp khác`
          : "";
      setErrorMsg(
        `Từ chối ${rejectedFiles.length} tệp không tương thích (${names}${extra}). Dự án thuộc phân loại ${modalityMeta.label}, chỉ chấp nhận định dạng: ${modalityMeta.allowedExtensions.map((e: string) => e.toUpperCase()).join(", ")}.`
      );
    } else {
      setErrorMsg(null);
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);

      // Check images in background if modality is image
      if (modalityMeta.code === "image") {
        for (const f of validFiles) {
          const isValid = await validateImageFile(f);
          if (!isValid) {
            setCorruptedFileNames((prev) => new Set(prev).add(f.name));
          }
        }
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
        <DialogTitle className="flex items-center gap-2">
          <span>Tải lên tập tin dữ liệu</span>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
            {modalityMeta.shortLabel}
          </span>
        </DialogTitle>
        <DialogDescription>
          Kéo thả hoặc chọn các tệp ({modalityMeta.allowedExtensions.map((e: string) => e.toUpperCase()).join(", ")}) phù hợp với bài toán {templateTitle || modalityMeta.domainGroup}. Tải trực tiếp ở chế độ nền.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {errorMsg && (
          <div className="rounded-md border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        {/* Drag & Drop Area */}
        <label
          htmlFor="dataset-file-upload"
          onDragOver={(e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`block cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-[border-color,background-color] duration-150 ${
            isDragging
              ? "border-primary-500 bg-primary-500/5"
              : "border-slate-300 hover:border-slate-400 dark:border-slate-700"
          }`}
        >
          <input
            ref={fileInputRef}
            id="dataset-file-upload"
            type="file"
            multiple
            accept={modalityMeta.acceptAttribute}
            className="hidden"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleFileSelect(e.target.files)
            }
          />
          <div className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              {renderModalityIcon(modalityMeta.iconName, "h-6 w-6")}
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Kéo & thả tập tin {modalityMeta.shortLabel.toLowerCase()} vào đây, hoặc{" "}
              <span className="text-primary-600 underline">
                duyệt từ máy tính
              </span>
            </p>
            <p className="text-xs text-slate-400">
              Chấp nhận: {modalityMeta.allowedExtensions.map((e: string) => e.toUpperCase()).join(", ")} (Tự động tải ngầm và kiểm tra SHA256)
            </p>
          </div>
        </label>

        {/* Selected File Queue List */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Đã chọn {selectedFiles.length} tập tin ({formatSize(totalSize)})
              </span>
              <button
                type="button"
                onClick={() => setSelectedFiles([])}
                className="text-rose-500 hover:underline"
              >
                Xóa tất cả
              </button>
            </div>

            <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-slate-100 p-2 pr-1 dark:border-slate-800">
              {selectedFiles.map((f: File, idx: number) => {
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
                          <AlertTriangle className="mr-1 inline h-3 w-3" />
                          Ảnh bị hỏng
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      aria-label={`Bỏ ${f.name} khỏi hàng đợi`}
                      className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                    >
                      <X className="h-4 w-4" />
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
          <UploadCloud className="mr-2 h-4 w-4" />
          Tải lên ở nền ({selectedFiles.length} tệp)
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
