"use client";

import * as React from "react";
import {
  ArrowRight,
  ChevronRight,
  GitCompare,
  PlusCircle,
  RefreshCw,
  Shuffle,
  Trash2,
} from "lucide-react";
import { Badge, Button, Dialog, DialogContent, Notice } from "@/components/ui";
import {
  useSnapshotDiffItemsQuery,
  useSnapshotDiffSummaryQuery,
} from "../hooks/use-snapshot";
import type { DiffChangeType, SnapshotResponse } from "../types";

interface SnapshotDiffModalProps {
  projectId: string;
  snapshots: SnapshotResponse[];
  initialBaseId?: string;
  open: boolean;
  onClose: () => void;
}

export function SnapshotDiffModal({
  projectId,
  snapshots,
  initialBaseId,
  open,
  onClose,
}: SnapshotDiffModalProps) {
  // Only READY or ARCHIVED snapshots can be compared
  const validSnapshots = React.useMemo(() => {
    return snapshots.filter(
      (s) => s.status === "READY" || s.status === "ARCHIVED"
    );
  }, [snapshots]);

  const [selectedBaseId, setSelectedBaseId] = React.useState<string>("");
  const [selectedTargetId, setSelectedTargetId] = React.useState<string>("");

  const defaultBaseId =
    initialBaseId || validSnapshots[1]?.id || validSnapshots[0]?.id || "";
  const baseId = selectedBaseId || defaultBaseId;

  const defaultTargetId =
    validSnapshots.find((s) => s.id !== baseId)?.id ||
    validSnapshots[0]?.id ||
    "";
  const targetId = selectedTargetId || defaultTargetId;

  // Selected change type filter for granular items
  const [activeChangeType, setActiveChangeType] =
    React.useState<DiffChangeType>("added");
  const [itemsCursor, setItemsCursor] = React.useState<string | null>(null);

  // Reset items cursor when base, target or changeType changes
  const handleTypeChange = (type: DiffChangeType) => {
    setActiveChangeType(type);
    setItemsCursor(null);
  };

  // Queries
  const {
    data: diffSummary,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useSnapshotDiffSummaryQuery(projectId, baseId, targetId);

  const {
    data: diffItemsData,
    isLoading: isItemsLoading,
    error: itemsError,
    refetch: refetchItems,
  } = useSnapshotDiffItemsQuery(projectId, {
    base_id: baseId,
    target_id: targetId,
    change_type: activeChangeType,
    cursor: itemsCursor,
    limit: 50,
  });

  return (
    <Dialog open={open} onOpenChange={onClose} className="max-w-4xl">
      <DialogContent onClose={onClose}>
        <div className="space-y-5">
          {/* Header */}
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <GitCompare
                className="h-5 w-5 text-blue-600"
                aria-hidden="true"
              />
              <h2 className="text-lg font-bold text-slate-900">
                So Sánh Khác Biệt Giữa 2 Snapshot (Diff)
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Phân tích biến động tài sản dữ liệu, thay đổi nhãn và dịch chuyển
              phân vùng giữa hai bản đóng gói.
            </p>
          </div>

          {/* Selectors for Base & Target */}
          <div className="grid grid-cols-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:grid-cols-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                Bản gốc (Base Snapshot A)
              </label>
              <select
                aria-label="Bản gốc Base Snapshot A"
                value={baseId}
                onChange={(e) => {
                  setSelectedBaseId(e.target.value);
                  setItemsCursor(null);
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {validSnapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.version_name} ({s.status}) - ID: {s.id.slice(0, 8)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center sm:col-span-1">
              <ArrowRight className="hidden h-5 w-5 text-slate-400 sm:block" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                Bản đích so sánh (Target Snapshot B)
              </label>
              <select
                aria-label="Bản đích so sánh Target Snapshot B"
                value={targetId}
                onChange={(e) => {
                  setSelectedTargetId(e.target.value);
                  setItemsCursor(null);
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {validSnapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.version_name} ({s.status}) - ID: {s.id.slice(0, 8)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {baseId === targetId && (
            <Notice tone="warning" title="Hai phiên bản trùng nhau">
              <p className="text-xs text-amber-800">
                Vui lòng chọn 2 phiên bản Snapshot khác nhau để thực hiện so
                sánh.
              </p>
            </Notice>
          )}

          {/* Error handling - strict no silent fallback */}
          {summaryError && (
            <Notice
              tone="danger"
              title="Không thể tính toán dữ liệu so sánh (Diff)"
            >
              <p className="text-xs text-rose-800">{String(summaryError)}</p>
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchSummary()}
                >
                  Thử lại
                </Button>
              </div>
            </Notice>
          )}

          {/* Loading */}
          {isSummaryLoading && (
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
              aria-busy="true"
            >
              <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
            </div>
          )}

          {/* Summary KPIs */}
          {diffSummary && !isSummaryLoading && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <PlusCircle className="h-4 w-4" />
                    Asset Thêm Mới
                  </div>
                  <div className="mt-1 text-xl font-bold text-emerald-900">
                    +{diffSummary.added_asset_count.toLocaleString("vi-VN")}
                  </div>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800">
                    <Trash2 className="h-4 w-4" />
                    Asset Bị Loại Bỏ
                  </div>
                  <div className="mt-1 text-xl font-bold text-rose-900">
                    -{diffSummary.removed_asset_count.toLocaleString("vi-VN")}
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <RefreshCw className="h-4 w-4" />
                    Sửa Bản Nhãn
                  </div>
                  <div className="mt-1 text-xl font-bold text-amber-900">
                    ~
                    {diffSummary.modified_annotation_count.toLocaleString(
                      "vi-VN"
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-800">
                    <Shuffle className="h-4 w-4" />
                    Chuyển Split
                  </div>
                  <div className="mt-1 text-xl font-bold text-purple-900">
                    {diffSummary.split_movement_count.toLocaleString("vi-VN")}
                  </div>
                </div>
              </div>

              {/* Class distribution shift deltas */}
              {diffSummary.class_distribution_deltas &&
                Object.keys(diffSummary.class_distribution_deltas).length >
                  0 && (
                  <div className="rounded-xl border border-slate-200 p-3.5">
                    <h3 className="text-xs font-bold text-slate-800">
                      Biến Động Tần Suất Nhãn (Category Deltas)
                    </h3>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {Object.entries(
                        diffSummary.class_distribution_deltas
                      ).map(([cat, delta]) => {
                        const isPositive = delta > 0;
                        const isZero = delta === 0;
                        return (
                          <span
                            key={cat}
                            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium ${
                              isPositive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : isZero
                                  ? "border-slate-200 bg-slate-50 text-slate-600"
                                  : "border-rose-200 bg-rose-50 text-rose-800"
                            }`}
                          >
                            <span>{cat}:</span>
                            <strong className="font-mono">
                              {isPositive ? `+${delta}` : delta}
                            </strong>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Granular Item Deltas Section */}
              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-800">
                    Chi Tiết Từng Phần Tử Khác Biệt
                  </h3>

                  {/* Filter tabs */}
                  <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
                    {[
                      { key: "added", label: "Thêm mới" },
                      { key: "removed", label: "Bị xoá" },
                      { key: "modified", label: "Sửa nhãn" },
                      { key: "split_changed", label: "Đổi split" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() =>
                          handleTypeChange(tab.key as DiffChangeType)
                        }
                        className={`rounded-md px-2.5 py-1 transition-colors ${
                          activeChangeType === tab.key
                            ? "shadow-xs bg-white text-blue-700"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {itemsError && (
                  <Notice
                    tone="danger"
                    title="Không thể tải chi tiết items delta"
                  >
                    <p className="text-xs text-rose-800">
                      {String(itemsError)}
                    </p>
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetchItems()}
                      >
                        Thử lại
                      </Button>
                    </div>
                  </Notice>
                )}

                {isItemsLoading && (
                  <div className="space-y-2 py-4" aria-busy="true">
                    <div className="h-8 animate-pulse rounded bg-slate-200" />
                    <div className="h-8 animate-pulse rounded bg-slate-200" />
                  </div>
                )}

                {diffItemsData && !isItemsLoading && (
                  <div>
                    <div className="max-h-60 overflow-auto rounded-lg border border-slate-200">
                      <table className="min-w-full text-left text-xs">
                        <thead className="sticky top-0 bg-slate-100 text-[11px] font-semibold text-slate-700">
                          <tr>
                            <th className="px-3 py-2">Asset ID</th>
                            <th className="px-3 py-2">Loại biến động</th>
                            <th className="px-3 py-2">Base (A)</th>
                            <th className="px-3 py-2">Target (B)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {diffItemsData.items.map((item) => (
                            <tr
                              key={item.asset_id}
                              className="hover:bg-slate-50"
                            >
                              <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">
                                {item.asset_id}
                              </td>
                              <td className="px-3 py-2">
                                <Badge
                                  variant={
                                    item.change_type === "added"
                                      ? "success"
                                      : item.change_type === "removed"
                                        ? "destructive"
                                        : item.change_type === "modified"
                                          ? "warning"
                                          : "info"
                                  }
                                >
                                  {item.change_type}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                                {item.change_type === "split_changed"
                                  ? `Split: ${item.base_split}`
                                  : item.base_revision_id
                                    ? `Rev: ${item.base_revision_id.slice(0, 10)}...`
                                    : "-"}
                              </td>
                              <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                                {item.change_type === "split_changed"
                                  ? `Split: ${item.target_split}`
                                  : item.target_revision_id
                                    ? `Rev: ${item.target_revision_id.slice(0, 10)}...`
                                    : "-"}
                              </td>
                            </tr>
                          ))}

                          {diffItemsData.items.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="py-6 text-center text-xs text-slate-500"
                              >
                                Không có phần tử nào thuộc nhóm{" "}
                                {activeChangeType}.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination for items */}
                    {diffItemsData.next_cursor && (
                      <div className="mt-2.5 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setItemsCursor(diffItemsData.next_cursor || null)
                          }
                        >
                          Tải thêm trang kế tiếp
                          <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
