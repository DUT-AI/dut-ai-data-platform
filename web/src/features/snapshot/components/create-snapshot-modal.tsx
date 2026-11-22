"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, Layers3 } from "lucide-react";
import { Button, Dialog, DialogContent, Input, Notice } from "@/components/ui";
import { datasetApi } from "@/features/dataset/api";
import { loadProjectOntology } from "@/features/ontology/api";
import { extractErrorMessage } from "../api/snapshot-api";
import { useCreateSnapshotMutation } from "../hooks/use-snapshot";
import type {
  SelectionPolicy,
  SnapshotCreateRequest,
  SnapshotResponse,
  SplitStrategy,
} from "../types";

interface CreateSnapshotModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (snapshot: SnapshotResponse) => void;
}

export function CreateSnapshotModal({
  projectId,
  open,
  onClose,
  onSuccess,
}: CreateSnapshotModalProps) {
  // Fetch real project datasets
  const {
    data: datasets,
    isLoading: isDatasetsLoading,
    error: datasetsError,
  } = useQuery({
    queryKey: ["project-datasets", projectId],
    queryFn: () => datasetApi.getProjectDatasets(projectId),
    enabled: open && Boolean(projectId),
  });

  // Fetch real project ontology
  const {
    data: ontology,
    error: ontologyError,
  } = useQuery({
    queryKey: ["project-ontology", projectId],
    queryFn: () => loadProjectOntology(projectId),
    enabled: open && Boolean(projectId),
  });

  // Form states
  const [selectedDatasetId, setSelectedDatasetId] = React.useState<string>("");
  const [selectedDatasetVersionId, setSelectedDatasetVersionId] =
    React.useState<string>("");
  const [selectedOntologyVersionId, setSelectedOntologyVersionId] =
    React.useState<string>("");
  const [versionName, setVersionName] = React.useState<string>("");
  const [selectionPolicy, setSelectionPolicy] =
    React.useState<SelectionPolicy>("LATEST_APPROVED");
  const [includeUnannotated, setIncludeUnannotated] =
    React.useState<boolean>(false);
  const [splitStrategy, setSplitStrategy] =
    React.useState<SplitStrategy>("STRATIFIED");
  const [trainRatio, setTrainRatio] = React.useState<number>(70);
  const [valRatio, setValRatio] = React.useState<number>(15);
  const [testRatio, setTestRatio] = React.useState<number>(15);
  const [splitSeed, setSplitSeed] = React.useState<number>(42);

  const [formError, setFormError] = React.useState<string | null>(null);

  const createMutation = useCreateSnapshotMutation(projectId);

  // Derived effective dataset and version
  const effectiveDatasetId = selectedDatasetId || datasets?.[0]?.id || "";
  const currentDataset = datasets?.find((d) => d.id === effectiveDatasetId);
  const defaultVersionId =
    currentDataset?.versions?.find((v) => v.status === "published")?.id ||
    currentDataset?.versions?.[0]?.id ||
    "";
  const effectiveDatasetVersionId = selectedDatasetVersionId || defaultVersionId;

  // Published ontology versions
  const publishedOntologyVersions = React.useMemo(() => {
    if (!ontology?.versions) return [];
    return ontology.versions.filter((v) => v.status === "published");
  }, [ontology]);

  const effectiveOntologyVersionId =
    selectedOntologyVersionId || publishedOntologyVersions[0]?.id || "";

  // Validate split ratio sum = 100%
  const totalRatio = trainRatio + valRatio + testRatio;
  const isRatioValid = totalRatio === 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!effectiveDatasetVersionId) {
      setFormError("Vui lòng chọn một phiên bản Dataset (Dataset Version).");
      return;
    }

    if (!effectiveOntologyVersionId) {
      setFormError(
        "Vui lòng chọn một phiên bản Ontology đã Publish. Không thể tạo snapshot nếu chưa có Ontology Version công bố."
      );
      return;
    }

    if (!isRatioValid) {
      setFormError(
        `Tổng tỷ lệ Train + Validation + Test phải bằng 100% (Hiện tại: ${totalRatio}%).`
      );
      return;
    }

    const payload: SnapshotCreateRequest = {
      dataset_version_id: effectiveDatasetVersionId,
      ontology_version_id: effectiveOntologyVersionId,
      version_name: versionName.trim() ? versionName.trim() : null,
      selection_policy: selectionPolicy,
      include_unannotated: includeUnannotated,
      split_strategy: splitStrategy,
      split_ratios: {
        train: Math.round((trainRatio / 100) * 1000) / 1000,
        validation: Math.round((valRatio / 100) * 1000) / 1000,
        test: Math.round((testRatio / 100) * 1000) / 1000,
      },
      split_seed: splitSeed,
    };

    try {
      const result = await createMutation.mutateAsync(payload);
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const errMsg = extractErrorMessage(
        err,
        "Đã xảy ra lỗi khi gửi yêu cầu tạo Snapshot lên máy chủ."
      );
      setFormError(errMsg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose} className="max-w-xl">
      <DialogContent onClose={onClose}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Tạo Bản Đóng Gói (Snapshot) Mới
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Snapshot đóng băng phiên bản dữ liệu và ontology bất biến phục vụ huấn luyện ML và xuất file an toàn.
            </p>
          </div>

          {/* Form error message if any */}
          {formError && (
            <Notice tone="danger" title="Lỗi gửi yêu cầu">
              <p className="text-xs text-rose-800">{formError}</p>
            </Notice>
          )}

          {/* Data fetching errors if any */}
          {datasetsError && (
            <Notice tone="danger" title="Lỗi tải danh sách Dataset">
              <p className="text-xs text-rose-800">{String(datasetsError)}</p>
            </Notice>
          )}
          {ontologyError && (
            <Notice tone="danger" title="Lỗi tải Ontology">
              <p className="text-xs text-rose-800">{String(ontologyError)}</p>
            </Notice>
          )}

          <div className="space-y-4">
            {/* Version name */}
            <div>
              <label
                htmlFor="version_name"
                className="block text-xs font-semibold text-slate-800"
              >
                Tên phiên bản (tuỳ chọn)
              </label>
              <Input
                id="version_name"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="Ví dụ: v1.0.0 hoặc release-2026-11 (để trống để tự sinh v1, v2...)"
                className="mt-1 text-xs"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Tên phiên bản là duy nhất trong project. Nên đặt theo định dạng ngữ nghĩa (SemVer).
              </p>
            </div>

            {/* Dataset & Dataset Version */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-800">
                  <Database className="mr-1 inline h-3.5 w-3.5 text-slate-600" />
                  Chọn Dataset
                </label>
                <select
                  aria-label="Chọn Dataset"
                  value={effectiveDatasetId}
                  onChange={(e) => {
                    setSelectedDatasetId(e.target.value);
                    setSelectedDatasetVersionId("");
                  }}
                  disabled={isDatasetsLoading}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  {datasets?.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name} ({ds.versions?.length || 0} phiên bản)
                    </option>
                  ))}
                  {(!datasets || datasets.length === 0) && (
                    <option value="">Chưa có dataset nào</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800">
                  Dataset Version *
                </label>
                <select
                  aria-label="Dataset Version"
                  value={effectiveDatasetVersionId}
                  onChange={(e) => setSelectedDatasetVersionId(e.target.value)}
                  disabled={
                    !currentDataset?.versions ||
                    currentDataset.versions.length === 0
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                  required
                >
                  {currentDataset?.versions?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.version} (
                      {v.status === "published" ? "Đã công bố" : "Bản nháp"} -{" "}
                      {v.asset_count} assets)
                    </option>
                  ))}
                  {(!currentDataset?.versions ||
                    currentDataset.versions.length === 0) && (
                      <option value="">Dataset chưa có version nào</option>
                    )}
                </select>
              </div>
            </div>

            {/* Ontology Version */}
            <div>
              <label className="block text-xs font-semibold text-slate-800">
                <Layers3 className="mr-1 inline h-3.5 w-3.5 text-slate-600" />
                Phiên bản Ontology công bố (Published) *
              </label>
              <select
                aria-label="Phiên bản Ontology công bố"
                value={effectiveOntologyVersionId}
                onChange={(e) => setSelectedOntologyVersionId(e.target.value)}
                disabled={publishedOntologyVersions.length === 0}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                required
              >
                {publishedOntologyVersions.map((ov) => (
                  <option key={ov.id} value={ov.id}>
                    v{ov.version_no}: {ov.name} ({ov.outputs?.length || 0} nhãn
                    - Schema: {ov.schema_hash?.slice(0, 8) || "N/A"})
                  </option>
                ))}
                {publishedOntologyVersions.length === 0 && (
                  <option value="">
                    Không có Ontology Version nào ở trạng thái Published
                  </option>
                )}
              </select>
              {publishedOntologyVersions.length === 0 && (
                <p className="mt-1 text-[11px] text-amber-700">
                  ⚠️ Dự án cần ít nhất 1 phiên bản Ontology được Publish trước khi đóng gói Snapshot.
                </p>
              )}
            </div>

            {/* Selection Policy & Include unannotated */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-800">
                  Chính sách chọn nhãn
                </label>
                <select
                  aria-label="Chính sách chọn nhãn"
                  value={selectionPolicy}
                  onChange={(e) =>
                    setSelectionPolicy(e.target.value as SelectionPolicy)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value="LATEST_APPROVED">
                    Bản duyệt mới nhất (Khuyên dùng)
                  </option>
                  <option value="LATEST_SUBMITTED">Bản nộp mới nhất</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={includeUnannotated}
                    onChange={(e) => setIncludeUnannotated(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Bao gồm mẫu chưa gán nhãn (Negative samples)</span>
                </label>
              </div>
            </div>

            {/* Split Strategy & Seed */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-800">
                  Thuật toán chia tập (Split)
                </label>
                <select
                  aria-label="Thuật toán chia tập"
                  value={splitStrategy}
                  onChange={(e) =>
                    setSplitStrategy(e.target.value as SplitStrategy)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value="STRATIFIED">
                    Phân tầng nhãn (Stratified)
                  </option>
                  <option value="RANDOM">Ngẫu nhiên (Random)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="split_seed"
                  className="block text-xs font-semibold text-slate-800"
                >
                  Random Seed
                </label>
                <Input
                  id="split_seed"
                  type="number"
                  value={splitSeed}
                  onChange={(e) => setSplitSeed(Number(e.target.value))}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            {/* Split ratios (Train, Val, Test) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  Tỷ lệ phân chia tập dữ liệu (%)
                </span>
                <span
                  className={`text-xs font-bold ${isRatioValid ? "text-emerald-700" : "text-rose-600"
                    }`}
                >
                  Tổng: {totalRatio}% {isRatioValid ? "✓" : "≠ 100%"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <label
                    htmlFor="train_ratio"
                    className="block text-[11px] font-medium text-slate-600"
                  >
                    Train (%)
                  </label>
                  <Input
                    id="train_ratio"
                    type="number"
                    min="0"
                    max="100"
                    value={trainRatio}
                    onChange={(e) => setTrainRatio(Number(e.target.value))}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label
                    htmlFor="val_ratio"
                    className="block text-[11px] font-medium text-slate-600"
                  >
                    Validation (%)
                  </label>
                  <Input
                    id="val_ratio"
                    type="number"
                    min="0"
                    max="100"
                    value={valRatio}
                    onChange={(e) => setValRatio(Number(e.target.value))}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label
                    htmlFor="test_ratio"
                    className="block text-[11px] font-medium text-slate-600"
                  >
                    Test (%)
                  </label>
                  <Input
                    id="test_ratio"
                    type="number"
                    min="0"
                    max="100"
                    value={testRatio}
                    onChange={(e) => setTestRatio(Number(e.target.value))}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              {/* Live preview visual bar */}
              <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="bg-blue-600 transition-[width] duration-150"
                  style={{ width: `${Math.max(0, trainRatio)}%` }}
                  title={`Train: ${trainRatio}%`}
                />
                <div
                  className="bg-amber-500 transition-[width] duration-150"
                  style={{ width: `${Math.max(0, valRatio)}%` }}
                  title={`Validation: ${valRatio}%`}
                />
                <div
                  className="bg-emerald-500 transition-[width] duration-150"
                  style={{ width: `${Math.max(0, testRatio)}%` }}
                  title={`Test: ${testRatio}%`}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                !effectiveDatasetVersionId ||
                !effectiveOntologyVersionId ||
                !isRatioValid
              }
            >
              {createMutation.isPending
                ? "Đang gửi yêu cầu..."
                : "Bắt đầu tạo Snapshot"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
