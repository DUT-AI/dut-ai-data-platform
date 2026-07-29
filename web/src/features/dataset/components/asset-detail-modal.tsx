"use client";

import { useRouter } from "next/navigation";
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

interface AssetDetailModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  /** ID project Platform — dùng để gọi open-in-label-studio */
  projectId?: string;
  /** Ontology version ID đang active của project — dùng cho LS label config */
  ontologyVersionId?: string;
  /** Dataset Version ID để điều hướng và load asset queue gán nhãn liên tục */
  datasetVersionId?: string;
}

export function AssetDetailModal({
  asset,
  isOpen,
  onClose,
  projectId,
  ontologyVersionId,
  datasetVersionId,
}: AssetDetailModalProps) {
  if (!asset) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AssetDetailContent
        asset={asset}
        onClose={onClose}
        projectId={projectId}
        ontologyVersionId={ontologyVersionId}
        datasetVersionId={datasetVersionId}
      />
    </Dialog>
  );
}

function AssetDetailContent({
  asset,
  onClose,
  projectId,
  ontologyVersionId,
  datasetVersionId,
}: {
  asset: Asset;
  onClose: () => void;
  projectId?: string;
  ontologyVersionId?: string;
  datasetVersionId?: string;
}) {
  const router = useRouter();
  const { data: downloadData, isLoading: isDownloadLoading } =
    useAssetDownloadUrlQuery(asset.id);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = asset.mime_type.startsWith("image/");
  const isPdf = asset.mime_type === "application/pdf";

  const handleStartAnnotation = () => {
    if (!projectId) return;
    router.push(
      `/projects/${projectId}/annotate/${asset.id}?ontologyVersionId=${ontologyVersionId || ""}&datasetVersionId=${datasetVersionId || ""}`
    );
  };

  return (
    <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
      <DialogHeader>
        <DialogTitle className="truncate font-mono text-base">
          {asset.filename}
        </DialogTitle>
        <DialogDescription>
          Chi tiết thuộc tính lưu trữ và xem trước tập tin.
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 space-y-4 overflow-y-auto py-2">
        {/* File Preview Area */}
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-4">
          {isImage && downloadData?.download_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={downloadData.download_url}
              alt={asset.filename}
              className="max-h-64 rounded object-contain"
            />
          ) : isPdf && downloadData?.download_url ? (
            <iframe
              src={downloadData.download_url}
              title={asset.filename}
              className="h-64 w-full rounded border-0"
            />
          ) : (
            <div className="space-y-2 text-center text-slate-400">
              <div className="text-4xl">📄</div>
              <p className="font-mono text-xs">{asset.mime_type}</p>
            </div>
          )}
        </div>

        {/* Metadata Table Inspector */}
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Thông số kỹ thuật (Metadata Inspector)
          </h4>

          <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
            <div>
              <span className="font-medium text-slate-900 dark:text-slate-200">
                Asset ID:
              </span>{" "}
              <span className="font-mono">{asset.id}</span>
            </div>
            <div>
              <span className="font-medium text-slate-900 dark:text-slate-200">
                MIME Type:
              </span>{" "}
              <span className="font-mono">{asset.mime_type}</span>
            </div>
            <div>
              <span className="font-medium text-slate-900 dark:text-slate-200">
                Kích thước file:
              </span>{" "}
              <span>{formatSize(asset.file_size)}</span>
            </div>
            <div>
              <span className="font-medium text-slate-900 dark:text-slate-200">
                Ngày tải lên:
              </span>{" "}
              <span>
                {asset.created_at
                  ? new Date(asset.created_at).toLocaleString("vi-VN")
                  : "N/A"}
              </span>
            </div>

            {asset.metadata?.width && asset.metadata?.height && (
              <div>
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  Độ phân giải:
                </span>{" "}
                <span>
                  {asset.metadata.width} × {asset.metadata.height} px
                </span>
              </div>
            )}

            {asset.metadata?.page_count && (
              <div>
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  Số trang PDF:
                </span>{" "}
                <span>{asset.metadata.page_count} trang</span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
            <span className="font-medium text-slate-900 dark:text-slate-200">
              SHA256 Checksum:
            </span>
            <p className="mt-1 break-all rounded border border-slate-200 bg-white p-1.5 font-mono text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {asset.sha256}
            </p>
          </div>
        </div>
      </div>

      <DialogFooter className="flex items-center justify-between pt-2">
        <Button
          variant="default"
          onClick={handleStartAnnotation}
          disabled={!projectId}
          className="text-xs"
        >
          ✏️ Gán nhãn (Annotate)
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
              <Button isLoading={isDownloadLoading}>⬇ Tải tệp xuống</Button>
            </a>
          )}
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
