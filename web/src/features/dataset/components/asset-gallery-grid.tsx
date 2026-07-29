"use client";

import { useState } from "react";
import { Badge, Card } from "@/components/ui";
import { Asset } from "../types/dataset";
import { useRemoveVersionAssetMutation } from "../hooks/use-datasets";
import { AssetDetailModal } from "./asset-detail-modal";

interface AssetGalleryGridProps {
  versionId: string;
  assets: Asset[];
  isEditable: boolean;
  projectId?: string;
  ontologyVersionId?: string;
}

export function AssetGalleryGrid({
  versionId,
  assets,
  isEditable,
  projectId,
  ontologyVersionId,
}: AssetGalleryGridProps) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const removeMutation = useRemoveVersionAssetMutation(versionId);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleRemove = (assetId: string, filename: string) => {
    if (confirm(`Bạn có chắc muốn xóa tập tin "${filename}" khỏi phiên bản này?`)) {
      removeMutation.mutate(assetId);
    }
  };

  if (assets.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
        <div className="text-3xl">📦</div>
        <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
          Chưa có tập tin dữ liệu nào trong phiên bản này
        </p>
        <p className="text-xs text-slate-400">
          Nhấn vào nút &quot;+ Batch Upload&quot; phía trên để tải tập tin lên.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {assets.map((asset) => {
          const isImage = asset.mime_type.startsWith("image/");
          const isPdf = asset.mime_type === "application/pdf";

          return (
            <Card
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
              className="group overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              {/* Card Thumbnail Box */}
              <div className="h-32 bg-slate-100 dark:bg-slate-950 flex items-center justify-center relative overflow-hidden">
                {isImage ? (
                  <div className="flex flex-col items-center justify-center text-slate-400 text-2xl font-bold">
                    🖼️
                  </div>
                ) : isPdf ? (
                  <div className="text-3xl">📄</div>
                ) : (
                  <div className="text-3xl">📁</div>
                )}

                <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-900/80 text-slate-200 font-semibold">
                  {asset.mime_type.split("/")[1] || "file"}
                </span>

                {isEditable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(asset.id, asset.filename);
                    }}
                    title="Xóa khỏi phiên bản"
                    className="absolute top-2 right-2 p-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Card Meta Description */}
              <div className="p-3 space-y-1">
                <h4 className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 truncate" title={asset.filename}>
                  {asset.filename}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{formatSize(asset.file_size)}</span>
                  <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                    {asset.sha256.substring(0, 6)}...
                  </Badge>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <AssetDetailModal
        asset={selectedAsset}
        isOpen={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
        projectId={projectId}
        ontologyVersionId={ontologyVersionId}
      />
    </>
  );
}
