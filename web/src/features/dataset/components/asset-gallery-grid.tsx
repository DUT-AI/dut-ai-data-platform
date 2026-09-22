"use client";

import { useState } from "react";
import { Badge, Button, ConfirmDialog, EmptyState } from "@/components/ui";
import {
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
import { useRemoveVersionAssetMutation } from "../hooks";
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

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
        {assets.map((asset) => {
          const category = getAssetCategory(asset.filename, asset.mime_type);
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

          return (
            <article
              key={asset.id}
              className="group flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white transition-[border-color,box-shadow] duration-150 hover:border-blue-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Card Thumbnail Box */}
              <div className="relative flex h-32 items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-950">
                <button
                  type="button"
                  aria-label={`Xem chi tiết ${asset.filename}`}
                  className="absolute inset-0 flex items-center justify-center text-slate-500"
                  onClick={() => setSelectedAsset(asset)}
                >
                  <AssetIcon className="h-9 w-9" aria-hidden="true" />
                </button>

                <span className="absolute left-2 top-2 rounded bg-slate-900/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-200">
                  {asset.mime_type.split("/")[1] || "file"}
                </span>

                {isEditable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssetToRemove(asset);
                    }}
                    title="Xóa khỏi phiên bản"
                    aria-label={`Xoá ${asset.filename} khỏi version`}
                    className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-rose-600 shadow-sm transition-opacity hover:bg-rose-50 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Card Meta Description */}
              <div className="space-y-1 p-3">
                <h4
                  className="truncate font-mono text-xs font-semibold text-slate-900 dark:text-slate-100"
                  title={asset.filename}
                >
                  {asset.filename}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{formatSize(asset.file_size)}</span>
                  <Badge
                    variant="outline"
                    className="px-1 py-0 font-mono text-[9px]"
                  >
                    {asset.sha256.substring(0, 6)}...
                  </Badge>
                </div>
              </div>
            </article>
          );
        })}
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
