"use client";

import * as React from "react";
import { Check, Copy, FileCheck2, HardDrive, ShieldCheck } from "lucide-react";
import { Badge, Button, Dialog, DialogContent, Notice } from "@/components/ui";
import { useSnapshotManifestQuery } from "../hooks/use-snapshot";

interface SnapshotManifestModalProps {
  projectId: string;
  snapshotId: string | null;
  snapshotVersionName?: string;
  open: boolean;
  onClose: () => void;
}

export function SnapshotManifestModal({
  projectId,
  snapshotId,
  snapshotVersionName,
  open,
  onClose,
}: SnapshotManifestModalProps) {
  const {
    data: manifest,
    isLoading,
    error,
    refetch,
  } = useSnapshotManifestQuery(projectId, snapshotId);

  const [copiedChecksum, setCopiedChecksum] = React.useState(false);
  const [copiedUri, setCopiedUri] = React.useState(false);

  const handleCopyChecksum = () => {
    if (manifest?.aggregate_checksum) {
      navigator.clipboard.writeText(manifest.aggregate_checksum);
      setCopiedChecksum(true);
      setTimeout(() => setCopiedChecksum(false), 2000);
    }
  };

  const handleCopyUri = () => {
    if (manifest?.storage_uri) {
      navigator.clipboard.writeText(manifest.storage_uri);
      setCopiedUri(true);
      setTimeout(() => setCopiedUri(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose} className="max-w-3xl">
      <DialogContent onClose={onClose}>
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck2
                  className="h-5 w-5 text-emerald-600"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-bold text-slate-900">
                  Manifest Bản Đóng Gói
                </h2>
                {snapshotVersionName && (
                  <Badge variant="neutral">{snapshotVersionName}</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Chứng chỉ kiểm toán và siêu dữ liệu cấu trúc đóng băng của
                Snapshot.
              </p>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3 py-6" aria-busy="true">
              <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200" />
              <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
            </div>
          )}

          {/* Error handling - strict no silent fallback */}
          {error && (
            <Notice tone="danger" title="Không thể tải Manifest">
              <p className="text-xs text-rose-800">{String(error)}</p>
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  Thử lại
                </Button>
              </div>
            </Notice>
          )}

          {/* Manifest content */}
          {manifest && !isLoading && (
            <div className="space-y-4">
              {/* High-level KPIs */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <span className="text-[11px] font-medium text-slate-500">
                    Tổng số Asset
                  </span>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {manifest.asset_count.toLocaleString("vi-VN")}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <span className="text-[11px] font-medium text-slate-500">
                    Tổng Annotations
                  </span>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {manifest.annotation_count.toLocaleString("vi-VN")}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <span className="text-[11px] font-medium text-slate-500">
                    Dataset Version ID
                  </span>
                  <div
                    className="mt-1 truncate font-mono text-xs font-semibold text-slate-800"
                    title={manifest.dataset_version_id}
                  >
                    {manifest.dataset_version_id}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <span className="text-[11px] font-medium text-slate-500">
                    Ontology Version ID
                  </span>
                  <div
                    className="mt-1 truncate font-mono text-xs font-semibold text-slate-800"
                    title={manifest.ontology_version_id}
                  >
                    {manifest.ontology_version_id}
                  </div>
                </div>
              </div>

              {/* Checksum & Storage URI */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Aggregate SHA-256 Checksum (Bảo toàn tính toàn vẹn)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyChecksum}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800"
                    >
                      {copiedChecksum ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Đã chép
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Sao chép
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-1.5 break-all rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs text-slate-800">
                    {manifest.aggregate_checksum}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <HardDrive className="h-4 w-4 text-sky-600" />
                      Object Storage URI (S3 / MinIO)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUri}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800"
                    >
                      {copiedUri ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Đã chép
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Sao chép
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-1.5 break-all rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs text-slate-800">
                    {manifest.storage_uri}
                  </div>
                </div>
              </div>

              {/* Split Distribution */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-xs font-bold text-slate-800">
                  Phân bố Tập Dữ Liệu (Split Distribution)
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {Object.entries(manifest.split_distribution || {}).map(
                    ([splitKey, dist]) => {
                      const color =
                        splitKey === "train"
                          ? "border-blue-200 bg-blue-50/50 text-blue-900"
                          : splitKey === "validation"
                            ? "border-amber-200 bg-amber-50/50 text-amber-900"
                            : "border-emerald-200 bg-emerald-50/50 text-emerald-900";
                      return (
                        <div
                          key={splitKey}
                          className={`rounded-lg border p-3 ${color}`}
                        >
                          <div className="text-xs font-bold uppercase">
                            {splitKey}
                          </div>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-lg font-bold">
                              {dist.count.toLocaleString("vi-VN")} items
                            </span>
                            <span className="text-xs font-semibold">
                              {Math.round(dist.percentage * 100)}%
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Class Distribution Table */}
              {manifest.class_distribution &&
                Object.keys(manifest.class_distribution).length > 0 && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-xs font-bold text-slate-800">
                      Phân bố Nhãn / Category theo Split
                    </h3>
                    <div className="mt-2.5 max-h-56 overflow-auto rounded-lg border border-slate-100">
                      <table className="min-w-full text-left text-xs">
                        <thead className="sticky top-0 bg-slate-100 text-[11px] font-semibold text-slate-700">
                          <tr>
                            <th className="px-3 py-2">Tên Nhãn (Category)</th>
                            <th className="px-3 py-2 text-right">Train</th>
                            <th className="px-3 py-2 text-right">Validation</th>
                            <th className="px-3 py-2 text-right">Test</th>
                            <th className="px-3 py-2 text-right font-bold">
                              Tổng cộng
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {Object.entries(manifest.class_distribution).map(
                            ([category, counts]) => {
                              const train = counts.train ?? 0;
                              const val = counts.validation ?? 0;
                              const test = counts.test ?? 0;
                              const total = train + val + test;
                              return (
                                <tr
                                  key={category}
                                  className="hover:bg-slate-50"
                                >
                                  <td className="px-3 py-1.5 font-medium text-slate-800">
                                    {category}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono text-slate-600">
                                    {train.toLocaleString("vi-VN")}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono text-slate-600">
                                    {val.toLocaleString("vi-VN")}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono text-slate-600">
                                    {test.toLocaleString("vi-VN")}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900">
                                    {total.toLocaleString("vi-VN")}
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end border-t border-slate-100 pt-3">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
