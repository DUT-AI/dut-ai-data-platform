"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle,
  CheckCircle2,
  Circle,
  Database,
  Eye,
  FileImage,
  History,
  Loader2,
  MessageSquare,
  Package,
  PenTool,
  Send,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { Badge, Button } from "@/components/ui";
import {
  Asset,
  useAssetDownloadUrlQuery,
  useVersionAssetsQuery,
} from "@/features/dataset";
import {
  BatchAssetStatusItem,
  useBatchAssetStatusQuery,
} from "@/features/annotation";
import type { AssetReviewItem, WorkItem } from "../types";
import { getStatusBadgeVariant, getStatusLabel } from "./status-helpers";
import { TransitionDialog } from "./transition-dialog";
import { cn } from "@/lib/utils";

interface BatchAssetsModalProps {
  projectId: string;
  workItem: WorkItem | null;
  datasetName?: string;
  versionName?: string;
  onClose: () => void;
}

function formatSize(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function AssetPreviewCard({
  asset,
  index,
  projectId,
  versionId,
  workItemId,
  status,
  isLastAnnotated,
  review,
}: {
  asset: Asset;
  index: number;
  projectId: string;
  versionId: string;
  workItemId: string;
  status?: BatchAssetStatusItem;
  isLastAnnotated?: boolean;
  review?: AssetReviewItem;
}) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const isImage =
    asset.mime_type?.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(asset.filename);

  const { data: downloadData } = useAssetDownloadUrlQuery(
    isImage && !asset.download_url ? asset.id : ""
  );

  const imageUrl = asset.download_url || downloadData?.download_url;
  const isAnnotated = Boolean(status?.is_annotated);
  const isNeedsRevision = review?.status === "NEEDS_REVISION";
  const isApproved = review?.status === "APPROVED";
  const isFixed = review?.status === "FIXED";

  const handleAnnotate = () => {
    router.push(
      `/projects/${projectId}/annotate/${asset.id}?datasetVersionId=${versionId}&workItemId=${workItemId}`
    );
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-xs transition hover:shadow-md",
        isNeedsRevision
          ? "border-rose-400 ring-2 ring-rose-400/25 bg-rose-50/10"
          : isFixed
            ? "border-blue-400 ring-2 ring-blue-400/25 bg-blue-50/10"
            : isApproved
              ? "border-emerald-300 ring-1 ring-emerald-300/40 bg-emerald-50/10"
              : isLastAnnotated
                ? "border-blue-400 ring-2 ring-blue-400/25"
                : isAnnotated
                  ? "border-slate-200 hover:border-slate-400"
                  : "border-slate-200 hover:border-blue-400"
      )}
    >
      {/* Thumbnail area */}
      <div className="relative flex h-36 w-full items-center justify-center overflow-hidden bg-slate-100">
        {isImage && imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={asset.filename}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-slate-400">
            <FileImage className="h-8 w-8 stroke-1" />
            <span className="text-[10px] font-mono uppercase">
              {asset.filename.split(".").pop() || "FILE"}
            </span>
          </div>
        )}

        {/* Index badge */}
        <span className="absolute left-2 top-2 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
          #{index + 1}
        </span>

        {/* Review or Annotation status badge */}
        {isNeedsRevision ? (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-rose-600/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
            <XCircle className="h-3 w-3 shrink-0" />
            <span>Cần sửa</span>
          </span>
        ) : isFixed ? (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-blue-600/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            <span>Đã sửa</span>
          </span>
        ) : isApproved ? (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-emerald-600/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            <span>Đạt</span>
          </span>
        ) : isAnnotated ? (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-slate-800/90 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-xs backdrop-blur-xs">
            <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
            <span>
              {status && status.objects_count > 0
                ? `${status.objects_count} nhãn`
                : "Đã gán"}
            </span>
          </span>
        ) : (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 backdrop-blur-xs">
            <Circle className="h-2 w-2 text-slate-400" />
            <span>Chưa làm</span>
          </span>
        )}

        {/* Last annotated indicator */}
        {isLastAnnotated && !isNeedsRevision && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-blue-600/90 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-xs backdrop-blur-xs">
            <Sparkles className="h-2.5 w-2.5" />
            <span>Vừa làm</span>
          </span>
        )}
      </div>

      {/* Meta info & Reviewer Feedback */}
      <div className="flex flex-1 flex-col justify-between p-2.5">
        <div>
          <p
            className="truncate text-xs font-semibold text-slate-800"
            title={asset.filename}
          >
            {asset.filename}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>{formatSize(asset.file_size)}</span>
            {asset.metadata?.width && asset.metadata?.height && (
              <span>
                {String(asset.metadata.width)}x{String(asset.metadata.height)}
              </span>
            )}
          </div>

          {/* Reviewer Comment Callout for this asset */}
          {isNeedsRevision && review?.comment && (
            <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-950 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                <MessageSquare className="h-3 w-3" /> Góp ý của Reviewer:
              </div>
              <p className="mt-0.5 line-clamp-3 font-medium text-slate-800">
                {review.comment}
              </p>
            </div>
          )}
          {isFixed && review?.comment && (
            <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/70 p-2 text-xs text-blue-950 shadow-2xs">
              <div className="flex items-center justify-between text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Góp ý:
                </span>
                <span className="rounded bg-blue-200/80 px-1 py-0.2 text-[9px] font-semibold lowercase text-blue-800">
                  đã sửa xong
                </span>
              </div>
              <p className="mt-0.5 line-clamp-2 font-medium text-slate-700">
                {review.comment}
              </p>
            </div>
          )}
        </div>

        <div className="mt-2.5 border-t border-slate-100 pt-2">
          {isNeedsRevision ? (
            <Button
              size="sm"
              onClick={handleAnnotate}
              className="h-7 w-full gap-1 px-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs truncate"
            >
              <PenTool className="h-3 w-3 shrink-0" />
              <span className="truncate">Sửa nhãn asset này</span>
            </Button>
          ) : isFixed ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAnnotate}
              className="h-7 w-full gap-1 px-2 text-xs font-medium border-blue-300 text-blue-700 hover:bg-blue-50 truncate"
            >
              <Check className="h-3 w-3 shrink-0 text-blue-600" />
              <span className="truncate">Đã sửa • Xem / Sửa tiếp</span>
            </Button>
          ) : isApproved ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAnnotate}
              className="h-7 w-full gap-1 px-2 text-xs font-medium border-emerald-300 text-emerald-700 hover:bg-emerald-50 truncate"
            >
              <Eye className="h-3 w-3 shrink-0" />
              <span className="truncate">Xem nhãn</span>
            </Button>
          ) : (
            <Button
              size="sm"
              variant={isAnnotated ? "outline" : "default"}
              onClick={handleAnnotate}
              className={cn(
                "h-7 w-full gap-1 px-2 text-xs font-medium whitespace-nowrap truncate",
                isAnnotated
                  ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                  : "bg-blue-600 text-white shadow-xs hover:bg-blue-700"
              )}
            >
              <PenTool className="h-3 w-3 shrink-0" />
              <span className="truncate">{isAnnotated ? "Xem / Sửa nhãn" : "Gán nhãn"}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function BatchAssetsModal({
  projectId,
  workItem,
  datasetName,
  versionName,
  onClose,
}: BatchAssetsModalProps) {
  const router = useRouter();
  const [isTransitionOpen, setIsTransitionOpen] = useState(false);
  const [filterReviewTab, setFilterReviewTab] = useState<
    "ALL" | "NEEDS_REVISION" | "FIXED" | "APPROVED" | "PENDING"
  >("ALL");

  const metadata = (workItem?.metadata || {}) as Record<string, unknown>;
  const assetIds = useMemo(() => {
    if (Array.isArray(metadata.asset_ids)) {
      return metadata.asset_ids as string[];
    }
    return [];
  }, [metadata.asset_ids]);

  const versionId = (metadata.dataset_version_id as string) || "";
  const displayDatasetName =
    (metadata.dataset_name as string) || datasetName || "Tập dữ liệu";
  const displayVersionName =
    (metadata.dataset_version_name as string) || versionName || "";

  const { data: allVersionAssets = [], isLoading } = useVersionAssetsQuery(versionId);

  // Batch annotation status query
  const { data: batchStatusData } = useBatchAssetStatusQuery(assetIds);
  const statusMap = useMemo(
    () => batchStatusData?.statuses || {},
    [batchStatusData]
  );

  // Filter and preserve order of assets that belong to this batch
  const batchAssets = useMemo(() => {
    if (allVersionAssets.length === 0) return [];
    if (assetIds.length === 0) return allVersionAssets;
    const assetMap = new Map(allVersionAssets.map((a) => [a.id, a]));
    return assetIds
      .map((id) => assetMap.get(id))
      .filter((a): a is Asset => Boolean(a));
  }, [allVersionAssets, assetIds]);

  const assetReviews = useMemo(() => {
    return (metadata.asset_reviews || {}) as Record<string, AssetReviewItem>;
  }, [metadata.asset_reviews]);

  const {
    approvedAssets,
    needsRevisionAssets,
    fixedAssets,
    unreviewedAssets,
  } = useMemo(() => {
    const approved: Asset[] = [];
    const needsFix: Asset[] = [];
    const fixed: Asset[] = [];
    const pending: Asset[] = [];

    for (const a of batchAssets) {
      const r = assetReviews[a.id];
      if (r?.status === "APPROVED") {
        approved.push(a);
      } else if (r?.status === "NEEDS_REVISION") {
        needsFix.push(a);
      } else if (r?.status === "FIXED") {
        fixed.push(a);
      } else {
        pending.push(a);
      }
    }
    return {
      approvedAssets: approved,
      needsRevisionAssets: needsFix,
      fixedAssets: fixed,
      unreviewedAssets: pending,
    };
  }, [batchAssets, assetReviews]);

  const filteredAssets = useMemo(() => {
    if (filterReviewTab === "NEEDS_REVISION") return needsRevisionAssets;
    if (filterReviewTab === "FIXED") return fixedAssets;
    if (filterReviewTab === "APPROVED") return approvedAssets;
    if (filterReviewTab === "PENDING") return unreviewedAssets;
    return batchAssets;
  }, [
    filterReviewTab,
    batchAssets,
    needsRevisionAssets,
    fixedAssets,
    approvedAssets,
    unreviewedAssets,
  ]);

  const {
    annotatedAssets,
    lastAnnotatedAsset,
    firstUnannotatedAsset,
  } = useMemo(() => {
    const done: Asset[] = [];
    const pending: Asset[] = [];

    for (const a of batchAssets) {
      if (statusMap[a.id]?.is_annotated) {
        done.push(a);
      } else {
        pending.push(a);
      }
    }

    // Sort done assets by latest updated_at to find the most recently annotated one
    const sortedDone = [...done].sort((a, b) => {
      const timeA = statusMap[a.id]?.last_updated_at
        ? new Date(statusMap[a.id]!.last_updated_at!).getTime()
        : 0;
      const timeB = statusMap[b.id]?.last_updated_at
        ? new Date(statusMap[b.id]!.last_updated_at!).getTime()
        : 0;
      return timeB - timeA;
    });

    return {
      annotatedAssets: done,
      lastAnnotatedAsset: sortedDone[0] || null,
      firstUnannotatedAsset: pending[0] || null,
    };
  }, [batchAssets, statusMap]);

  if (!workItem) return null;

  const totalCount = batchAssets.length || assetIds.length;
  const annotatedCount = annotatedAssets.length;
  const progressPercent =
    totalCount > 0 ? Math.round((annotatedCount / totalCount) * 100) : 0;

  const nextAssetIndex = firstUnannotatedAsset
    ? batchAssets.findIndex((a) => a.id === firstUnannotatedAsset.id)
    : -1;
  const lastAssetIndex = lastAnnotatedAsset
    ? batchAssets.findIndex((a) => a.id === lastAnnotatedAsset.id)
    : -1;

  const handleJumpToNextUnannotated = () => {
    const target = firstUnannotatedAsset || batchAssets[0];
    if (target) {
      router.push(
        `/projects/${projectId}/annotate/${target.id}?datasetVersionId=${versionId}&workItemId=${workItem.id}`
      );
    }
  };

  const handleJumpToLastAnnotated = () => {
    if (lastAnnotatedAsset) {
      router.push(
        `/projects/${projectId}/annotate/${lastAnnotatedAsset.id}?datasetVersionId=${versionId}&workItemId=${workItem.id}`
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-assets-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="batch-assets-title"
                  className="text-base font-semibold text-slate-900"
                >
                  {workItem.resource_id}
                </h2>
                <Badge variant={getStatusBadgeVariant(workItem.status)}>
                  {getStatusLabel(workItem.status)}
                </Badge>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Database className="h-3.5 w-3.5 text-slate-400" />
                  {displayDatasetName}
                </span>
                {displayVersionName && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[11px] font-mono text-slate-600">
                    {displayVersionName}
                  </span>
                )}
                <span>•</span>
                <span className="font-semibold text-blue-600">
                  {totalCount} assets
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Đóng"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress & Jump Action Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-slate-600">Tiến độ lô:</span>
                <span className="font-bold text-slate-900">
                  {annotatedCount} / {totalCount} asset
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    progressPercent === 100
                      ? "text-emerald-600"
                      : "text-blue-600"
                  )}
                >
                  ({progressPercent}%)
                </span>
              </div>
              <div className="mt-1 h-2 w-44 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    progressPercent === 100 ? "bg-emerald-500" : "bg-blue-600"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Re-submit button for Rejected batches */}
            {workItem.status === "REJECTED" && (
              <Button
                size="sm"
                onClick={() => setIsTransitionOpen(true)}
                className="h-8 gap-1.5 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                title="Đã sửa xong, nộp lại toàn bộ lô cho Reviewer kiểm duyệt"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Nộp lại kiểm duyệt</span>
              </Button>
            )}

            {/* Direct jump to first asset needing revision */}
            {needsRevisionAssets.length > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  const target = needsRevisionAssets[0];
                  router.push(
                    `/projects/${projectId}/annotate/${target.id}?datasetVersionId=${versionId}&workItemId=${workItem.id}`
                  );
                }}
                className="h-8 gap-1.5 px-3 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                title="Nhảy tới sửa ngay asset đầu tiên cần sửa nhãn"
              >
                <PenTool className="h-3.5 w-3.5" />
                <span>
                  Sửa asset cần sửa (#{batchAssets.findIndex((a) => a.id === needsRevisionAssets[0].id) + 1})
                </span>
              </Button>
            )}

            {/* Jump to last annotated asset */}
            {lastAnnotatedAsset && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleJumpToLastAnnotated}
                className="h-8 gap-1.5 px-3 text-xs font-medium border-blue-200 text-blue-700 hover:bg-blue-50"
                title={`Nhảy tới Asset #${lastAssetIndex + 1} (${lastAnnotatedAsset.filename}) đã thực hiện`}
              >
                <History className="h-3.5 w-3.5 text-blue-600" />
                <span>Xem asset vừa gán (#{lastAssetIndex + 1})</span>
              </Button>
            )}

            {/* Jump to next unannotated asset */}
            {firstUnannotatedAsset ? (
              <Button
                size="sm"
                onClick={handleJumpToNextUnannotated}
                className="h-8 gap-1.5 px-3 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <PenTool className="h-3.5 w-3.5" />
                <span>
                  {annotatedCount > 0
                    ? `Tiếp tục gán nhãn (Asset #${nextAssetIndex + 1})`
                    : "Bắt đầu gán nhãn lô"}
                </span>
              </Button>
            ) : batchAssets.length > 0 && needsRevisionAssets.length === 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleJumpToNextUnannotated}
                className="h-8 gap-1.5 px-3 text-xs font-medium border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Xem lại toàn bộ lô (Asset #1)</span>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Review Status Filter Toolbar */}
        {(needsRevisionAssets.length > 0 ||
          fixedAssets.length > 0 ||
          approvedAssets.length > 0 ||
          workItem.status === "REJECTED" ||
          workItem.status === "IN_REVIEW") && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white px-6 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 mr-1">Phân loại review:</span>
              <button
                type="button"
                onClick={() => setFilterReviewTab("ALL")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                  filterReviewTab === "ALL"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                Tất cả ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterReviewTab("NEEDS_REVISION")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition flex items-center gap-1",
                  filterReviewTab === "NEEDS_REVISION"
                    ? "bg-rose-600 text-white"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                )}
              >
                <XCircle className="h-3 w-3" />
                Cần sửa ({needsRevisionAssets.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterReviewTab("FIXED")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition flex items-center gap-1",
                  filterReviewTab === "FIXED"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                )}
              >
                <Check className="h-3 w-3" />
                Đã sửa ({fixedAssets.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterReviewTab("APPROVED")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition flex items-center gap-1",
                  filterReviewTab === "APPROVED"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                )}
              >
                <CheckCircle2 className="h-3 w-3" />
                Đã duyệt đạt ({approvedAssets.length})
              </button>
              {unreviewedAssets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterReviewTab("PENDING")}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                    filterReviewTab === "PENDING"
                      ? "bg-slate-700 text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  Chưa đánh giá ({unreviewedAssets.length})
                </button>
              )}
            </div>

            {/* Thay chỗ thông báo thành nút lọc các asset đã được sửa */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setFilterReviewTab((prev) => (prev === "FIXED" ? "ALL" : "FIXED"))
                }
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition border shadow-2xs",
                  filterReviewTab === "FIXED"
                    ? "bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300/40"
                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                )}
                title="Bấm để lọc nhanh danh sách các asset đã được người làm sửa xong"
              >
                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {filterReviewTab === "FIXED"
                    ? `Đang lọc: Đã sửa (${fixedAssets.length})`
                    : `Lọc asset đã sửa (${fixedAssets.length})`}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-2 text-xs">Đang tải danh sách tập tin asset...</p>
            </div>
          ) : filteredAssets.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filteredAssets.map((asset) => {
                const originalIndex = batchAssets.findIndex((a) => a.id === asset.id);
                return (
                  <AssetPreviewCard
                    key={asset.id}
                    asset={asset}
                    index={originalIndex !== -1 ? originalIndex : 0}
                    projectId={projectId}
                    versionId={versionId}
                    workItemId={workItem.id}
                    status={statusMap[asset.id]}
                    isLastAnnotated={lastAnnotatedAsset?.id === asset.id}
                    review={assetReviews[asset.id]}
                  />
                );
              })}
            </div>
          ) : batchAssets.length > 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Không có asset nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : assetIds.length > 0 ? (
            <div>
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                Không tìm thấy chi tiết file từ phiên bản dữ liệu hiện hành, nhưng gói chứa{" "}
                <strong>{assetIds.length} asset IDs</strong>:
              </div>
              <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {assetIds.map((id, idx) => (
                  <li
                    key={id}
                    className="flex items-center justify-between p-2.5 text-xs"
                  >
                    <span className="font-medium text-slate-600">
                      Asset #{idx + 1}
                    </span>
                    <span className="font-mono text-slate-800">{id}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Lô công việc này chưa có danh sách asset liên kết.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-3">
          <span className="text-xs text-slate-500">
            Tổng: <strong>{totalCount}</strong> asset • Gán nhãn:{" "}
            <strong className="text-blue-600">{annotatedCount}</strong> • Cần sửa:{" "}
            <strong className="text-rose-600">{needsRevisionAssets.length}</strong> • Đã sửa:{" "}
            <strong className="text-blue-600">{fixedAssets.length}</strong> • Đạt:{" "}
            <strong className="text-emerald-600">{approvedAssets.length}</strong>
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>

      {/* Direct Re-submit transition dialog */}
      {isTransitionOpen && (
        <TransitionDialog
          workItem={workItem}
          defaultTarget="SUBMITTED"
          onClose={() => {
            setIsTransitionOpen(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}
