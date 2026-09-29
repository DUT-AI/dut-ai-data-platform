"use client";

import React from "react";
import { Table, SearchX, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TabularEmptyGridProps {
  type: "empty-file" | "no-results" | "error";
  errorMessage?: string;
  onResetFilters?: () => void;
  onRetry?: () => void;
}

export function TabularEmptyGrid({
  type,
  errorMessage,
  onResetFilters,
  onRetry,
}: TabularEmptyGridProps) {
  if (type === "error") {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-950/60 text-rose-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-rose-300">
          Không thể tải dữ liệu bảng
        </h4>
        <p className="mt-1 max-w-md text-xs text-slate-400">
          {errorMessage || "Đã xảy ra lỗi khi tải hoặc phân tích tập tin bảng này."}
        </p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-4 border-slate-700 bg-slate-900 text-xs text-slate-200 hover:bg-slate-800"
          >
            Thử tải lại
          </Button>
        )}
      </div>
    );
  }

  if (type === "no-results") {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-slate-400">
          <SearchX className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-200">
          Không tìm thấy dòng dữ liệu phù hợp
        </h4>
        <p className="mt-1 max-w-md text-xs text-slate-400">
          Không có bản ghi nào khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại.
        </p>
        {onResetFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="mt-3 text-xs text-blue-400 hover:text-blue-300"
          >
            Xóa bộ lọc và tìm kiếm
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-64 w-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-slate-500">
        <Table className="h-6 w-6" />
      </div>
      <h4 className="text-sm font-semibold text-slate-300">
        Tập tin bảng không có dữ liệu
      </h4>
      <p className="mt-1 max-w-md text-xs text-slate-400">
        Tập tin CSV/JSON này không chứa bản ghi dữ liệu hoặc không đúng định dạng.
      </p>
    </div>
  );
}
