"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { Asset } from "../types/dataset";
import { useAssetDownloadUrlQuery } from "../hooks/use-datasets";
import { AnnotationEditorModal } from "@/features/annotation";

interface AssetDetailModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  /** ID project Platform — dùng để gọi open-in-label-studio */
  projectId?: string;
  /** Ontology version ID đang active của project — dùng cho LS label config */
  ontologyVersionId?: string;
}

export function AssetDetailModal({
  asset,
  isOpen,
  onClose,
  projectId,
  ontologyVersionId,
}: AssetDetailModalProps) {
  if (!asset) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AssetDetailContent
        asset={asset}
        onClose={onClose}
        projectId={projectId}
        ontologyVersionId={ontologyVersionId}
      />
    </Dialog>
  );
}

function AssetDetailContent({
  asset,
  onClose,
  projectId,
  ontologyVersionId,
}: {
  asset: Asset;
  onClose: () => void;
  projectId?: string;
  ontologyVersionId?: string;
}) {
  const [isAnnoModalOpen, setIsAnnoModalOpen] = useState(false);
  const { data: downloadData, isLoading: isDownloadLoading } =
    useAssetDownloadUrlQuery(asset.id);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = asset.mime_type.startsWith("image/");
  const isPdf = asset.mime_type === "application/pdf";

  return (
    <>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate font-mono text-base">
            {asset.filename}
          </DialogTitle>
          <DialogDescription>
            Chi tiết thuộc tính lưu trữ và xem trước tập tin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* File Preview Area */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center min-h-[220px]">
            {isImage && downloadData?.download_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={downloadData.download_url}
                alt={asset.filename}
                className="max-h-64 object-contain rounded"
              />
            ) : isPdf && downloadData?.download_url ? (
              <iframe
                src={downloadData.download_url}
                title={asset.filename}
                className="w-full h-64 rounded border-0"
              />
            ) : (
              <div className="text-center space-y-2 text-slate-400">
                <div className="text-4xl">📄</div>
                <p className="text-xs font-mono">{asset.mime_type}</p>
              </div>
            )}
          </div>

          {/* Metadata Table Inspector */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-2 text-xs">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              Thông số kỹ thuật (Metadata Inspector)
            </h4>

            <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
              <div>
                <span className="font-medium text-slate-900 dark:text-slate-200">Asset ID:</span>{" "}
                <span className="font-mono">{asset.id}</span>
              </div>
              <div>
                <span className="font-medium text-slate-900 dark:text-slate-200">MIME Type:</span>{" "}
                <span className="font-mono">{asset.mime_type}</span>
              </div>
              <div>
                <span className="font-medium text-slate-900 dark:text-slate-200">Kích thước file:</span>{" "}
                <span>{formatSize(asset.file_size)}</span>
              </div>
              <div>
                <span className="font-medium text-slate-900 dark:text-slate-200">Ngày tải lên:</span>{" "}
                <span>
                  {asset.created_at
                    ? new Date(asset.created_at).toLocaleString("vi-VN")
                    : "N/A"}
                </span>
              </div>

              {asset.metadata?.width && asset.metadata?.height && (
                <div>
                  <span className="font-medium text-slate-900 dark:text-slate-200">Độ phân giải:</span>{" "}
                  <span>
                    {asset.metadata.width} × {asset.metadata.height} px
                  </span>
                </div>
              )}

              {asset.metadata?.page_count && (
                <div>
                  <span className="font-medium text-slate-900 dark:text-slate-200">Số trang PDF:</span>{" "}
                  <span>{asset.metadata.page_count} trang</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="font-medium text-slate-900 dark:text-slate-200">SHA256 Checksum:</span>
              <p className="font-mono text-[11px] break-all bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700 mt-1 text-slate-700 dark:text-slate-300">
                {asset.sha256}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setIsAnnoModalOpen(true)}
            className="text-xs"
          >
            🏷️ Xem Nhãn (Annotations)
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>

            {downloadData?.download_url && (
              <a
                href={downloadData.download_url}
                target="_blank"
                rel="noopener noreferrer"
                download={asset.filename}
              >
                <Button isLoading={isDownloadLoading}>
                  ⬇ Tải tệp xuống
                </Button>
              </a>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      <AnnotationEditorModal
        assetId={asset.id}
        assetFilename={asset.filename}
        downloadUrl={downloadData?.download_url}
        projectId={projectId}
        ontologyVersionId={ontologyVersionId}
        isOpen={isAnnoModalOpen}
        onClose={() => setIsAnnoModalOpen(false)}
      />
    </>
  );
}
