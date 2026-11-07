"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Database, Layers, Loader2, Plus, X } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { useProjectDatasetsQuery, useVersionAssetsQuery } from "@/features/dataset";
import { useCreateBatchesMutation } from "../hooks";

interface CreateBatchModalProps {
  projectId: string;
  workflowId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateBatchModal({
  projectId,
  workflowId,
  onClose,
  onSuccess,
}: CreateBatchModalProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [batchPrefix, setBatchPrefix] = useState("batch");
  const [batchSize, setBatchSize] = useState<number | "">(5);

  const effectiveBatchSize = typeof batchSize === "number" && batchSize > 0 ? batchSize : 1;

  const createBatchesMutation = useCreateBatchesMutation();

  // 1. Fetch real datasets of the project
  const { data: datasets = [], isLoading: isLoadingDatasets } =
    useProjectDatasetsQuery(projectId);

  const effectiveDatasetId = selectedDatasetId || datasets[0]?.id || "";
  const selectedDataset = useMemo(
    () => datasets.find((d) => d.id === effectiveDatasetId) || datasets[0],
    [datasets, effectiveDatasetId]
  );

  const versions = useMemo(
    () => selectedDataset?.versions ?? [],
    [selectedDataset]
  );

  const effectiveVersionId =
    selectedVersionId && versions.some((v) => v.id === selectedVersionId)
      ? selectedVersionId
      : versions[0]?.id || "";

  const selectedVersion = useMemo(
    () => versions.find((v) => v.id === effectiveVersionId) || versions[0],
    [versions, effectiveVersionId]
  );

  // 2. Fetch real assets of the active version
  const { data: assets = [], isLoading: isLoadingAssets } = useVersionAssetsQuery(
    selectedVersion?.id ?? ""
  );

  // Total real asset count in DB
  const totalAssets = assets.length > 0 ? assets.length : (selectedVersion?.asset_count ?? 0);
  const numBatches =
    totalAssets > 0 && effectiveBatchSize > 0 ? Math.ceil(totalAssets / effectiveBatchSize) : 0;

  const hasNoDatasets = !isLoadingDatasets && datasets.length === 0;
  const hasNoVersions = !isLoadingDatasets && Boolean(selectedDataset) && versions.length === 0;
  const hasNoAssets = !isLoadingAssets && Boolean(selectedVersion) && totalAssets === 0;
  const canSubmit =
    !isLoadingDatasets &&
    !isLoadingAssets &&
    !hasNoDatasets &&
    !hasNoVersions &&
    !hasNoAssets &&
    totalAssets > 0 &&
    effectiveBatchSize > 0 &&
    !createBatchesMutation.isPending;

  const handleCreateRealBatches = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || assets.length === 0) return;

    // Partition real assets by chunking array
    const batches = [];
    for (let i = 0; i < numBatches; i++) {
      const chunk = assets.slice(i * effectiveBatchSize, (i + 1) * effectiveBatchSize);
      batches.push({
        batch_id: `${batchPrefix}_${(i + 1).toString().padStart(2, "0")}`,
        asset_ids: chunk.map((asset) => asset.id),
      });
    }

    try {
      await createBatchesMutation.mutateAsync({
        workflow_id: workflowId,
        project_id: projectId,
        resource_type: "ANNOTATION_BATCH",
        dataset_id: selectedDataset?.id,
        dataset_version_id: selectedVersion?.id,
        dataset_name: selectedDataset?.name,
        dataset_version_name: selectedVersion?.version,
        batches,
      });
      onSuccess();
      onClose();
    } catch {
      // Handled by react-query
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-batch-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            <h2 id="create-batch-title" className="text-base font-semibold text-slate-900">
              Khởi tạo Lô công việc (Create Batches)
            </h2>
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

        <form onSubmit={handleCreateRealBatches} className="mt-4 space-y-4">
          {/* Dataset selection */}
          <div>
            <label htmlFor="select-dataset" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Database className="h-3.5 w-3.5 text-slate-500" />
              Tập dữ liệu (Dataset):
            </label>
            {isLoadingDatasets ? (
              <div className="mt-1 h-9 animate-pulse rounded-lg bg-slate-100" />
            ) : hasNoDatasets ? (
              <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  Chưa có tập dữ liệu nào trong dự án
                </div>
                <p className="mt-1 text-[11px] text-amber-700">
                  Vui lòng chuyển qua tab &quot;Tập dữ liệu&quot; để tạo dataset và tải ảnh lên trước khi chia lô công việc.
                </p>
              </div>
            ) : (
              <select
                id="select-dataset"
                value={effectiveDatasetId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedDatasetId(newId);
                  setSelectedVersionId("");
                  const targetDs = datasets.find((d) => d.id === newId);
                  if (targetDs?.name) {
                    const slug = targetDs.name
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "_")
                      .replace(/^_+|_+$/g, "");
                    setBatchPrefix(slug ? `${slug}_batch` : "batch");
                  }
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.status ? `(${d.status})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Version selection */}
          {!hasNoDatasets && (
            <div>
              <label htmlFor="select-version" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                Phiên bản (Version):
              </label>
              {hasNoVersions ? (
                <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  Tập dữ liệu này chưa có phiên bản nào.
                </div>
              ) : (
                <select
                  id="select-version"
                  value={effectiveVersionId}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.version} — {v.asset_count} assets {v.status ? `[${v.status}]` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Real asset count summary card */}
          {!hasNoDatasets && !hasNoVersions && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs">
                <span className="font-semibold text-slate-800">Tổng số asset thực tế:</span>
                <p className="text-[11px] text-slate-500">Dữ liệu thực từ bảng Asset trong Database</p>
              </div>
              <div className="flex items-center gap-1.5">
                {isLoadingAssets ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <Badge variant="outline" className="border-blue-200 bg-blue-50 font-mono text-xs font-bold text-blue-700">
                    {totalAssets} assets
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Empty asset warning */}
          {hasNoAssets && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                Phiên bản này hiện có 0 asset
              </div>
              <p className="mt-1 text-[11px] text-amber-700">
                Bạn cần tải ảnh/tệp lên phiên bản này trước khi có thể chia thành các lô công việc.
              </p>
            </div>
          )}

          {/* Batch configuration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="batch-prefix" className="text-xs font-semibold text-slate-700">
                Tiền tố mã Lô:
              </label>
              <input
                id="batch-prefix"
                type="text"
                value={batchPrefix}
                onChange={(e) => setBatchPrefix(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div>
              <label htmlFor="batch-size" className="text-xs font-semibold text-slate-700">
                Kích thước mỗi lô:
              </label>
              <input
                id="batch-size"
                type="number"
                min={1}
                max={500}
                value={batchSize}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setBatchSize("");
                  } else {
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed)) {
                      setBatchSize(parsed);
                    }
                  }
                }}
                onBlur={() => {
                  if (batchSize === "" || batchSize < 1) {
                    setBatchSize(5);
                  }
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {totalAssets > 0 && (
            <p className="text-[11px] text-slate-500">
              Sẽ tự động chia <span className="font-semibold text-slate-900">{totalAssets} asset thật</span> thành{" "}
              <span className="font-semibold text-blue-700">{numBatches} gói công việc</span> (`ANNOTATION_BATCH`) để phân công.
            </p>
          )}

          {createBatchesMutation.isError && (
            <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">
              {(createBatchesMutation.error as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail ||
                (createBatchesMutation.error as { message?: string })?.message ||
                "Có lỗi xảy ra khi tạo các lô công việc từ database."}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Hủy
            </Button>
            <Button size="sm" type="submit" disabled={!canSubmit}>
              {createBatchesMutation.isPending ? "Đang khởi tạo..." : "Khởi tạo lô"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
