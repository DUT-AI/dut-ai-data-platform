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
import { DatasetVersion, InheritDatasetVersionResponse } from "../types";
import { useInheritDatasetVersionMutation } from "../hooks";

interface InheritVersionModalProps {
  versionId: string;
  currentVersionString: string;
  datasetVersions: DatasetVersion[];
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export function InheritVersionModal({
  versionId,
  currentVersionString,
  datasetVersions,
  isOpen,
  onClose,
  projectId,
}: InheritVersionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && (
        <InheritVersionContent
          versionId={versionId}
          currentVersionString={currentVersionString}
          datasetVersions={datasetVersions}
          onClose={onClose}
          projectId={projectId}
        />
      )}
    </Dialog>
  );
}

function InheritVersionContent({
  versionId,
  currentVersionString,
  datasetVersions,
  onClose,
  projectId,
}: {
  versionId: string;
  currentVersionString: string;
  datasetVersions: DatasetVersion[];
  onClose: () => void;
  projectId?: string;
}) {
  const availableSourceVersions = datasetVersions.filter(
    (v) => v.id !== versionId
  );
  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    availableSourceVersions[0]?.id || ""
  );
  const [resultReport, setResultReport] =
    useState<InheritDatasetVersionResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inheritMutation = useInheritDatasetVersionMutation(
    versionId,
    projectId
  );

  const selectedSourceVersion = availableSourceVersions.find(
    (v) => v.id === selectedSourceId
  );
  const targetVersion = datasetVersions.find((v) => v.id === versionId);

  const handleInheritSubmit = () => {
    if (!selectedSourceId) return;

    setErrorMsg(null);
    inheritMutation.mutate(selectedSourceId, {
      onSuccess: (res) => {
        setResultReport(res);
      },
      onError: (err: unknown) => {
        const detail = (
          err as {
            response?: {
              data?: {
                detail?: string | Array<{ msg: string }>;
              };
            };
          }
        )?.response?.data?.detail;

        let msg = "Kế thừa phiên bản thất bại.";
        if (typeof detail === "string") {
          msg = detail;
        } else if (Array.isArray(detail)) {
          msg = detail.map((d) => d.msg).join("; ");
        }
        setErrorMsg(msg);
      },
    });
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <span>🔄</span> Kế thừa phiên bản dữ liệu
        </DialogTitle>
        <DialogDescription>
          Kế thừa tập tin dữ liệu từ một phiên bản khác trong cùng dataset vào
          phiên bản nháp{" "}
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {currentVersionString}
          </span>
          .
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2 text-xs">
        {errorMsg && (
          <div className="rounded-md border border-rose-500/20 bg-rose-500/10 p-3 text-rose-600 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        {resultReport ? (
          <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-300">
            <h4 className="text-sm font-bold">✓ Kế thừa thành công!</h4>
            <div className="space-y-1">
              <p>
                • Số tập tin mới đã kế thừa:{" "}
                <strong>{resultReport.added_assets_count}</strong>
              </p>
              <p>
                • Số tập tin đã tồn tại sẵn (bỏ qua trùng lặp):{" "}
                <strong>{resultReport.reused_assets_count}</strong>
              </p>
              <p>
                • Tổng số tập tin hiện tại:{" "}
                <strong>{resultReport.total_assets_count}</strong>
              </p>
            </div>
          </div>
        ) : availableSourceVersions.length === 0 ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-300">
            Chưa có phiên bản nào khác trong dataset này để kế thừa.
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="font-medium text-slate-700 dark:text-slate-300">
                Chọn phiên bản nguồn cần kế thừa:
              </label>
              <select
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 font-mono text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {availableSourceVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.version} ({v.status.toUpperCase()}) — {v.asset_count} tập
                    tin
                  </option>
                ))}
              </select>
            </div>

            {selectedSourceVersion && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Thông tin kế thừa:
                </p>
                <ul className="mt-1 space-y-1 text-[11px]">
                  <li>
                    • Nguồn:{" "}
                    <span className="font-mono">
                      {selectedSourceVersion.version}
                    </span>{" "}
                    ({selectedSourceVersion.asset_count} tập tin)
                  </li>
                  <li>
                    • Đích:{" "}
                    <span className="font-mono">{currentVersionString}</span> (
                    {targetVersion?.asset_count || 0} tập tin hiện có)
                  </li>
                  {targetVersion && targetVersion.asset_count > 0 ? (
                    <li className="text-amber-600 dark:text-amber-400">
                      ℹ️ Phiên bản đích đã có dữ liệu. Các tập tin trùng lặp sẽ
                      tự động được giữ nguyên.
                    </li>
                  ) : (
                    <li className="text-emerald-600 dark:text-emerald-400">
                      ✓ Phiên bản đích đang trống. Tất cả tập tin sẽ được kế
                      thừa nguyên vẹn.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={inheritMutation.isPending}
        >
          {resultReport ? "Đóng" : "Hủy"}
        </Button>

        {!resultReport && availableSourceVersions.length > 0 && (
          <Button
            onClick={handleInheritSubmit}
            isLoading={inheritMutation.isPending}
            disabled={!selectedSourceId}
          >
            Kế thừa ngay
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
