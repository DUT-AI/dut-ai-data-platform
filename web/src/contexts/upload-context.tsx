"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { datasetApi } from "@/features/dataset/api";
import { DATASET_KEYS } from "@/features/dataset/hooks/use-datasets";

export interface ActiveUploadJob {
  id: string;
  versionId: string;
  files: File[];
  fileProgresses: Record<number, number>;
  status: "uploading" | "finalizing" | "completed" | "error";
  errorMsg?: string;
  completedCount: number;
  totalCount: number;
  reusedCount?: number;
  newCount?: number;
  isMinimized: boolean;
}

interface UploadContextType {
  activeJobs: ActiveUploadJob[];
  startBackgroundUpload: (versionId: string, files: File[]) => void;
  dismissJob: (jobId: string) => void;
  toggleMinimizeJob: (jobId: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [activeJobs, setActiveJobs] = useState<ActiveUploadJob[]>([]);
  const queryClient = useQueryClient();

  // Protect against accidental browser tab refresh / close during active upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isUploading = activeJobs.some(
        (j) => j.status === "uploading" || j.status === "finalizing"
      );
      if (isUploading) {
        e.preventDefault();
        e.returnValue =
          "Quá trình tải lên tập tin đang diễn ra. Bạn có chắc chắn muốn rời khỏi trang hoặc làm mới?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeJobs]);

  const startBackgroundUpload = async (versionId: string, files: File[]) => {
    const jobId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newJob: ActiveUploadJob = {
      id: jobId,
      versionId,
      files,
      fileProgresses: {},
      status: "uploading",
      completedCount: 0,
      totalCount: files.length,
      isMinimized: false,
    };

    setActiveJobs((prev) => [...prev, newJob]);

    try {
      // Step 1: Prepare presigned URLs
      const preparePayload = {
        files: files.map((f) => ({
          filename: f.name,
          content_type: f.type || "application/octet-stream",
        })),
      };

      const prepareRes = await datasetApi.prepareAssetUpload(versionId, preparePayload);

      // Step 2: Concurrently upload to S3 and calculate true binary SHA-256
      const finalizeItems = await Promise.all(
        files.map(async (file, index) => {
          const presigned = prepareRes.items[index];

          const [sha256] = await Promise.all([
            computeSha256(file),
            datasetApi.uploadFileToS3(presigned.upload_url, file, (percent) => {
              setActiveJobs((prev) =>
                prev.map((job) => {
                  if (job.id !== jobId) return job;
                  const updatedProgresses = { ...job.fileProgresses, [index]: percent };
                  const completed = Object.values(updatedProgresses).filter((p) => p === 100).length;
                  return {
                    ...job,
                    fileProgresses: updatedProgresses,
                    completedCount: completed,
                  };
                })
              );
            }),
          ]);

          return {
            asset_id: presigned.asset_id,
            filename: file.name,
            storage_key: presigned.storage_key,
            sha256,
            file_size: file.size,
            mime_type: file.type || "application/octet-stream",
          };
        })
      );

      // Step 3: Finalize import & get deduplication stats
      setActiveJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, status: "finalizing" } : job
        )
      );

      const finalizeRes = await datasetApi.finalizeAssetImport(versionId, {
        items: finalizeItems,
      });

      setActiveJobs((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? {
              ...job,
              status: "completed",
              completedCount: files.length,
              reusedCount: finalizeRes.reused_assets_count,
              newCount: finalizeRes.new_assets_count,
            }
            : job
        )
      );


      // Invalidate dataset assets and version detail queries to update UI automatically
      queryClient.invalidateQueries({
        queryKey: DATASET_KEYS.versionAssets(versionId),
      });
      queryClient.invalidateQueries({
        queryKey: DATASET_KEYS.versionDetail(versionId),
      });
    } catch (err: unknown) {
      let msg = "Tải lên thất bại";
      if (err instanceof Error) msg = err.message;

      setActiveJobs((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? { ...job, status: "error", errorMsg: msg }
            : job
        )
      );
    }
  };

  const dismissJob = (jobId: string) => {
    setActiveJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  const toggleMinimizeJob = (jobId: string) => {
    setActiveJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, isMinimized: !j.isMinimized } : j))
    );
  };

  return (
    <UploadContext.Provider
      value={{
        activeJobs,
        startBackgroundUpload,
        dismissJob,
        toggleMinimizeJob,
      }}
    >
      {children}
      <FloatingUploadManager />
    </UploadContext.Provider>
  );
}

export function useUploadManager() {
  const ctx = useContext(UploadContext);
  if (!ctx) {
    throw new Error("useUploadManager must be used within an UploadProvider");
  }
  return ctx;
}

function FloatingUploadManager() {
  const { activeJobs, dismissJob, toggleMinimizeJob } = useUploadManager();

  if (activeJobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-auto">
      {activeJobs.map((job) => {
        const totalProgress =
          job.files.length > 0
            ? Math.round(
              Object.values(job.fileProgresses).reduce((a, b) => a + b, 0) /
              job.files.length
            )
            : 0;

        return (
          <div
            key={job.id}
            className="rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 text-slate-100 shadow-2xl backdrop-blur-md transition-all"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-base">
                  {job.status === "uploading"
                    ? "📤"
                    : job.status === "finalizing"
                      ? "⚡"
                      : job.status === "completed"
                        ? "✅"
                        : "⚠️"}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold truncate">
                    {job.status === "uploading"
                      ? `Đang tải lên, không tắt trang web... (${job.completedCount}/${job.totalCount} tệp)`
                      : job.status === "finalizing"
                        ? "Đang hoàn tất lưu trữ..."
                        : job.status === "completed"
                          ? "Tải lên hoàn tất!"
                          : "Tải lên có lỗi"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {totalProgress}% • {job.files.length} tập tin
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleMinimizeJob(job.id)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white text-xs"
                >
                  {job.isMinimized ? "▲" : "▼"}
                </button>
                <button
                  onClick={() => dismissJob(job.id)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-rose-400 text-xs"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full transition-all duration-300 ${job.status === "error"
                  ? "bg-rose-500"
                  : job.status === "completed"
                    ? "bg-emerald-500"
                    : "bg-primary-500"
                  }`}
                style={{
                  width: `${job.status === "completed"
                    ? 100
                    : job.status === "finalizing"
                      ? 95
                      : totalProgress
                    }%`,
                }}
              />
            </div>

            {/* Expanded Detailed File List */}
            {!job.isMinimized && (
              <div className="mt-3 max-h-36 space-y-1.5 overflow-y-auto pr-1 text-xs">
                {job.files.map((file, idx) => {
                  const p = job.fileProgresses[idx] ?? 0;
                  return (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex flex-col gap-1 rounded bg-slate-800/60 p-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="truncate font-mono font-medium max-w-[200px]">
                          {file.name}
                        </span>
                        <span className="text-slate-400 font-mono">{p}%</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full bg-primary-400 transition-all duration-150"
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Deduplication Summary Stats when completed */}
            {!job.isMinimized && job.status === "completed" && (
              <div className="mt-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-300 space-y-1">
                <p className="font-bold text-emerald-400">✓ Thống kê tải lên:</p>
                <p>• Tổng số tập tin xử lý: <strong>{job.totalCount}</strong></p>
                <p>• Tập tin mới lưu trữ MinIO S3: <strong>{job.newCount ?? job.totalCount}</strong></p>
                <p>• Tập tin trùng lặp SHA256 (Tái sử dụng): <strong>{job.reusedCount ?? 0}</strong></p>
              </div>
            )}

            {job.errorMsg && (
              <p className="mt-2 text-[11px] text-rose-400 font-medium">
                {job.errorMsg}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

