"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ListFilter, RefreshCw } from "lucide-react";
import { Badge, Button, Dialog, DialogContent, Notice } from "@/components/ui";
import { useSnapshotItemsQuery } from "../hooks/use-snapshot";

interface SnapshotItemsModalProps {
  projectId: string;
  snapshotId: string | null;
  snapshotVersionName?: string;
  open: boolean;
  onClose: () => void;
}

export function SnapshotItemsModal({
  projectId,
  snapshotId,
  snapshotVersionName,
  open,
  onClose,
}: SnapshotItemsModalProps) {
  const [splitFilter, setSplitFilter] = React.useState<string>("all");
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [cursorStack, setCursorStack] = React.useState<Array<string | null>>(
    []
  );

  // Reset pagination when splitFilter changes
  const handleSplitChange = (newSplit: string) => {
    setSplitFilter(newSplit);
    setCursor(null);
    setCursorStack([]);
  };

  const {
    data: itemsData,
    isLoading,
    error,
    refetch,
  } = useSnapshotItemsQuery(projectId, snapshotId, {
    split: splitFilter === "all" ? null : splitFilter,
    cursor,
    limit: 50,
  });

  const handleNextPage = () => {
    if (itemsData?.next_cursor) {
      setCursorStack((prev) => [...prev, cursor]);
      setCursor(itemsData.next_cursor);
    }
  };

  const handlePrevPage = () => {
    if (cursorStack.length > 0) {
      const prevCursor = cursorStack[cursorStack.length - 1];
      setCursorStack((prev) => prev.slice(0, prev.length - 1));
      setCursor(prevCursor);
    }
  };

  const handleResetToFirst = () => {
    setCursor(null);
    setCursorStack([]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose} className="max-w-4xl">
      <DialogContent onClose={onClose}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <ListFilter
                  className="h-5 w-5 text-blue-600"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-bold text-slate-900">
                  Dữ Liệu Đóng Gói (Snapshot Items)
                </h2>
                {snapshotVersionName && (
                  <Badge variant="neutral">{snapshotVersionName}</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Toàn bộ các mục dữ liệu bất biến được gán phân vùng và checksum
                SHA-256.
              </p>
            </div>

            {/* Split Filter Tabs */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
              {["all", "train", "validation", "test"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSplitChange(s)}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    splitFilter === s
                      ? "shadow-xs bg-white text-blue-700"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {s === "all" ? "Tất cả" : s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Error handling - strict no silent fallback */}
          {error && (
            <Notice
              tone="danger"
              title="Không thể tải danh sách Snapshot Items"
            >
              <p className="text-xs text-rose-800">{String(error)}</p>
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  Thử lại
                </Button>
              </div>
            </Notice>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="space-y-2 py-8" aria-busy="true">
              <div className="h-8 animate-pulse rounded bg-slate-200" />
              <div className="h-10 animate-pulse rounded bg-slate-200" />
              <div className="h-10 animate-pulse rounded bg-slate-200" />
              <div className="h-10 animate-pulse rounded bg-slate-200" />
            </div>
          )}

          {/* Table */}
          {itemsData && !isLoading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  Tổng số item khớp bộ lọc:{" "}
                  <strong className="text-slate-900">
                    {itemsData.total_count.toLocaleString("vi-VN")}
                  </strong>
                </span>
                <span>
                  Hiển thị: {itemsData.items.length} items (Keyset Cursor
                  pagination)
                </span>
              </div>

              <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] font-semibold text-slate-700">
                    <tr>
                      <th className="px-3 py-2">STT</th>
                      <th className="px-3 py-2">Asset ID</th>
                      <th className="px-3 py-2">Annotation Revision ID</th>
                      <th className="px-3 py-2">Phân chia (Split)</th>
                      <th className="px-3 py-2">Item Checksum (SHA-256)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {itemsData.items.map((item) => {
                      const splitVariant: "info" | "warning" | "success" =
                        item.split === "train"
                          ? "info"
                          : item.split === "validation"
                            ? "warning"
                            : "success";

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                            {item.sort_order}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">
                            {item.asset_id}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">
                            {item.annotation_revision_id ? (
                              item.annotation_revision_id
                            ) : (
                              <span className="italic text-slate-400">
                                Không có nhãn (Negative sample)
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={splitVariant}>
                              {item.split.toUpperCase()}
                            </Badge>
                          </td>
                          <td
                            className="max-w-xs truncate px-3 py-2 font-mono text-[11px] text-slate-500"
                            title={item.item_checksum}
                          >
                            {item.item_checksum}
                          </td>
                        </tr>
                      );
                    })}

                    {itemsData.items.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-xs text-slate-500"
                        >
                          Không có item nào trong phân vùng này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <div>
                  {cursorStack.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleResetToFirst}
                    >
                      <RefreshCw className="mr-1 h-3.5 w-3.5" />
                      Về trang đầu
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrevPage}
                    disabled={cursorStack.length === 0}
                  >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                    Trang trước
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={!itemsData.next_cursor}
                  >
                    Trang sau
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
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
