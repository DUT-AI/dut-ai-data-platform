"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TabularPaginationProps {
  pageIndex: number; // 0-based
  pageSize: number;
  totalFilteredRows: number;
  totalTotalRows: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
}

export function TabularPagination({
  pageIndex,
  pageSize,
  totalFilteredRows,
  totalTotalRows,
  onPageChange,
  onPageSizeChange,
}: TabularPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalFilteredRows / pageSize));
  const currentPage = Math.min(pageIndex + 1, totalPages);

  const startRecord =
    totalFilteredRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRecord = Math.min((pageIndex + 1) * pageSize, totalFilteredRows);

  // Generate compact page numbers list (max 5 visible buttons with ellipsis)
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 bg-slate-950 px-4 py-2.5 text-xs text-slate-400">
      {/* Left: Summary text */}
      <div className="flex items-center gap-2">
        <span>
          Hiển thị{" "}
          <strong className="font-mono text-slate-200">
            {startRecord}–{endRecord}
          </strong>{" "}
          trên tổng số{" "}
          <strong className="font-mono text-slate-200">
            {totalFilteredRows.toLocaleString()}
          </strong>{" "}
          bản ghi
          {totalFilteredRows !== totalTotalRows && (
            <span className="text-[11px] text-slate-500">
              {" "}(lọc từ {totalTotalRows.toLocaleString()})
            </span>
          )}
        </span>
      </div>

      {/* Right: Controls & Page buttons */}
      <div className="flex items-center gap-3">
        {/* Page size select */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500">Số dòng/trang:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-7 rounded border border-slate-800 bg-slate-900 px-2 font-mono text-xs text-slate-300 focus:border-blue-500 focus:outline-hidden"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pageIndex === 0}
            onClick={() => onPageChange(0)}
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200 disabled:opacity-30"
            title="Trang đầu"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pageIndex === 0}
            onClick={() => onPageChange(pageIndex - 1)}
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200 disabled:opacity-30"
            title="Trang trước"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) => {
              if (p === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 font-mono text-[11px] text-slate-600 select-none"
                  >
                    …
                  </span>
                );
              }
              const isCurrent = p === currentPage;
              return (
                <Button
                  key={p}
                  type="button"
                  variant={isCurrent ? "outline" : "ghost"}
                  size="sm"
                  onClick={() => onPageChange((p as number) - 1)}
                  className={`h-7 min-w-7 px-2 font-mono text-xs ${
                    isCurrent
                      ? "border-blue-500/50 bg-blue-950/60 font-semibold text-blue-300"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {p}
                </Button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pageIndex >= totalPages - 1}
            onClick={() => onPageChange(pageIndex + 1)}
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200 disabled:opacity-30"
            title="Trang sau"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pageIndex >= totalPages - 1}
            onClick={() => onPageChange(totalPages - 1)}
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200 disabled:opacity-30"
            title="Trang cuối"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
