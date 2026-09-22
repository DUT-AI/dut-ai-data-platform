"use client";

import { useState } from "react";
import { Badge, Button, ConfirmDialog, EmptyState } from "@/components/ui";
import { SearchX } from "lucide-react";
import { Asset } from "../types";
import { useRemoveVersionAssetMutation } from "../hooks";
import { AssetDetailModal } from "./asset-detail-modal";

interface AssetListTableProps {
  versionId: string;
  assets: Asset[];
  totalAssetsCount?: number;
  onResetFilters?: () => void;
  isEditable: boolean;
  projectId?: string;
  ontologyVersionId?: string;
}

export function AssetListTable({
  versionId,
  assets,
  totalAssetsCount,
  onResetFilters,
  isEditable,
  projectId,
  ontologyVersionId,
}: AssetListTableProps) {
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
      <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400 dark:border-slate-800">
        Chưa có tập tin dữ liệu nào trong phiên bản này.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
          <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3">Tên tập tin (Filename)</th>
              <th className="px-4 py-3">MIME Type</th>
              <th className="px-4 py-3">Kích thước</th>
              <th className="px-4 py-3">SHA256 Checksum</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
            {assets.map((asset) => (
              <tr
                key={asset.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
              >
                <td className="max-w-xs truncate px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                  {asset.filename}
                </td>
                <td className="px-4 py-3 font-mono">
                  <Badge variant="outline" className="text-[10px]">
                    {asset.mime_type}
                  </Badge>
                </td>
                <td className="px-4 py-3">{formatSize(asset.file_size)}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                  {asset.sha256.substring(0, 16)}...
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {asset.created_at
                    ? new Date(asset.created_at).toLocaleDateString("vi-VN")
                    : "N/A"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAsset(asset);
                      }}
                      className="h-7 text-xs"
                    >
                      Chi tiết
                    </Button>

                    {isEditable && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssetToRemove(asset);
                        }}
                        className="h-7 text-xs"
                      >
                        Xóa
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
