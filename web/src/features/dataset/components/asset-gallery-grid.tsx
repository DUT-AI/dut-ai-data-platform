"use client";

import React, { useState } from "react";
import { Badge, Button, ConfirmDialog, EmptyState } from "@/components/ui";
import {
  Eye,
  File,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  SearchX,
  Trash2,
} from "lucide-react";
import { Asset } from "../types";
import {
  useAssetDownloadUrlQuery,
  useRemoveVersionAssetMutation,
} from "../hooks";
import { AssetDetailModal } from "./asset-detail-modal";
import { getAssetCategory } from "./asset-preview";

interface AssetGalleryGridProps {
  versionId: string;
  assets: Asset[];
  totalAssetsCount?: number;
  onResetFilters?: () => void;
  isEditable: boolean;
  projectId?: string;
  ontologyVersionId?: string;
}

interface AssetGalleryCardProps {
  key?: string;
  asset: Asset;
  isEditable: boolean;
  onSelect: (asset: Asset) => void;
  onRemove: (asset: Asset) => void;
}

function AssetGalleryCard({
  asset,
  isEditable,
  onSelect,
  onRemove,
}: AssetGalleryCardProps) {
  const [imageError, setImageError] = useState(false);
  const category = getAssetCategory(asset.filename, asset.mime_type);
  const isImage = category === "image";

  // Lấy presigned URL nếu là hình ảnh và chưa có download_url sẵn
  const { data: downloadData, isLoading: isUrlLoading } =
    useAssetDownloadUrlQuery(isImage && !asset.download_url ? asset.id : "");

  const imageUrl = asset.download_url || downloadData?.download_url;

  const iconMap = {
    image: FileImage,
    video: FileVideo,
    audio: FileAudio,
    pdf: FileText,
    tabular: FileSpreadsheet,
    text: FileText,
    unknown: File,
  };
  const AssetIcon = iconMap[category] || File;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const extension =
    asset.filename.split(".").pop()?.toUpperCase() ||
    asset.mime_type.split("/")[1]?.toUpperCase() ||
    "FILE";

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white transition-[border-color,box-shadow] duration-150 hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      {/* Thumbnail Area */}
      <div className="relative aspect-[4/3] min-h-[120px] w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
        <button
          type="button"
          aria-label={`Xem chi tiết ${asset.filename}`}
          onClick={() => onSelect(asset)}
          className="relative flex h-full w-full items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {isImage ? (
            imageUrl && !imageError ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={asset.filename}
                  loading="lazy"
                  decoding="async"
                  onError={() => setImageError(true)}
                  className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-105"
                />
                {/* Hover overlay hint */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition-opacity duration-150 group-hover:bg-slate-950/30 group-hover:opacity-100"
                >
                  <span className="flex items-center gap-1 rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur-sm">
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Chi tiết</span>
                  </span>
                </div>
              </>
            ) : isUrlLoading ? (
              <div className="flex h-full w-full animate-pulse items-center justify-center bg-slate-100 dark:bg-slate-900">
                <FileImage className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                <AssetIcon className="h-8 w-8 text-slate-400" aria-hidden="true" />
                <span className="mt-1 font-mono text-[10px] text-slate-400">
                  {imageError ? "Lỗi hiển thị" : "Không có ảnh"}
                </span>
              </div>
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400 transition-colors group-hover:text-blue-500 dark:text-slate-500 dark:group-hover:text-blue-400">
              <AssetIcon className="h-10 w-10" aria-hidden="true" />
            </div>
          )}
        </button>

        {/* File extension badge */}
        <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-slate-900/75 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-100 shadow-sm backdrop-blur-sm">
          {extension}
        </span>

        {/* Delete action button */}
        {isEditable && (
          <button
            type="button"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              onRemove(asset);
            }}
            title="Xóa khỏi phiên bản"
            aria-label={`Xoá ${asset.filename} khỏi version`}
            className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-rose-600 shadow-sm backdrop-blur-sm transition-opacity hover:bg-rose-50 hover:text-rose-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:bg-slate-900/90 dark:text-rose-400 dark:hover:bg-rose-950/50 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Card Meta Description */}
      <div className="space-y-1 p-3">
        <button
          type="button"
          onClick={() => onSelect(asset)}
          className="w-full truncate text-left font-mono text-xs font-semibold text-slate-900 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:underline dark:text-slate-100 dark:hover:text-blue-400"
          title={asset.filename}
        >
          {asset.filename}
        </button>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="truncate">
            {formatSize(asset.file_size)}
            {Boolean(asset.metadata?.width && asset.metadata?.height) && (
              <span className="ml-1 opacity-70">
                · {String(asset.metadata?.width)}×{String(asset.metadata?.height)}
              </span>
            )}
          </span>
          <Badge
            variant="outline"
            className="ml-1 shrink-0 px-1 py-0 font-mono text-[9px]"
          >
            {asset.sha256.substring(0, 6)}...
          </Badge>
        </div>
      </div>
    </article>
  );
}

export function AssetGalleryGrid({
  versionId,
  assets,
  totalAssetsCount,
  onResetFilters,
  isEditable,
  projectId,
  ontologyVersionId,
}: AssetGalleryGridProps) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetToRemove, setAssetToRemove] = useState<Asset | null>(null);
  const removeMutation = useRemoveVersionAssetMutation(versionId);

  const handleRemove = async () => {
    if (!assetToRemove) return;
    await removeMutation.mutateAsync(assetToRemove.id);
    setAssetToRemove(null);
  };

  if (assets.length === 0) {
    if (totalAssetsCount && totalAssetsCount > 0) {
      return (
        <EmptyState
          icon={SearchX}
          title="Không có asset phù hợp"
          description="Thay đổi từ khoá hoặc xoá bộ lọc để xem lại toàn bộ dữ liệu trong version."
          action={
            onResetFilters ? (
              <Button size="sm" variant="outline" onClick={onResetFilters}>
                Xoá bộ lọc ({totalAssetsCount} asset)
              </Button>
            ) : undefined
          }
        />
      );
    }

    return (
      <EmptyState
        title="Version chưa có asset"
        description="Nếu version đang ở trạng thái Draft, dùng nút Tải dữ liệu để thêm asset."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {assets.map((asset) => (
          <AssetGalleryCard
            key={asset.id}
            asset={asset}
            isEditable={isEditable}
            onSelect={setSelectedAsset}
            onRemove={setAssetToRemove}
          />
        ))}
      </div>

      <AssetDetailModal
        asset={selectedAsset}
        isOpen={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
        projectId={projectId}
        ontologyVersionId={ontologyVersionId}
        datasetVersionId={versionId}
      />
      <ConfirmDialog
        open={Boolean(assetToRemove)}
        title={`Xoá “${assetToRemove?.filename || "asset"}” khỏi version?`}
        description="Liên kết asset với dataset version này sẽ bị xoá. Hãy kiểm tra các annotation liên quan trước khi tiếp tục."
        confirmLabel="Xoá asset"
        destructive
        isLoading={removeMutation.isPending}
        onClose={() => setAssetToRemove(null)}
        onConfirm={handleRemove}
      />
    </>
  );
}
