"use client";

import React from "react";
import { Input, Button, Badge } from "@/components/ui";

export interface FileTypeOption {
  mimeType: string;
  label: string;
  count: number;
}

export interface DateOption {
  dateStr: string; // YYYY-MM-DD
  displayLabel: string; // DD/MM/YYYY
  count: number;
}

interface AssetFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedFileType: string;
  onFileTypeChange: (value: string) => void;
  selectedDate: string;
  onDateChange: (value: string) => void;
  fileTypeOptions: FileTypeOption[];
  dateOptions: DateOption[];
  totalAssetsCount: number;
  filteredAssetsCount: number;
  onResetFilters: () => void;
}

export function AssetFilterToolbar({
  searchQuery,
  onSearchChange,
  selectedFileType,
  onFileTypeChange,
  selectedDate,
  onDateChange,
  fileTypeOptions,
  dateOptions,
  totalAssetsCount,
  filteredAssetsCount,
  onResetFilters,
}: AssetFilterToolbarProps) {
  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedFileType !== "all" ||
    selectedDate !== "all";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Side: Filter Control Group */}
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search Asset Name Input */}
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-4 w-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <Input
              type="text"
              placeholder="Tìm kiếm theo tên tập tin..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="focus:ring-primary-500 border-slate-200 bg-slate-50 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter by File Type (Dynamic based on dataset assets) */}
          <div className="flex items-center gap-1.5">
            <span className="hidden text-xs font-medium text-slate-500 sm:inline-block dark:text-slate-400">
              Loại file:
            </span>
            <select
              value={selectedFileType}
              onChange={(e) => onFileTypeChange(e.target.value)}
              className="focus:border-primary-500 focus:ring-primary-500 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 transition-colors focus:outline-none focus:ring-1 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="all">Tất cả loại file ({totalAssetsCount})</option>
              {fileTypeOptions.map((opt) => (
                <option key={opt.mimeType} value={opt.mimeType}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Date */}
          <div className="flex items-center gap-1.5">
            <span className="hidden text-xs font-medium text-slate-500 sm:inline-block dark:text-slate-400">
              Ngày tạo:
            </span>
            <select
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="focus:border-primary-500 focus:ring-primary-500 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 transition-colors focus:outline-none focus:ring-1 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="all">Tất cả ngày</option>
              {dateOptions.map((opt) => (
                <option key={opt.dateStr} value={opt.dateStr}>
                  {opt.displayLabel} ({opt.count})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onResetFilters}
              className="h-8 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
            >
              <svg
                className="mr-1 h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {/* Right Side: Assets Count Summary */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 lg:border-t-0 lg:pt-0 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Hiển thị:</span>
            <Badge
              variant={hasActiveFilters ? "default" : "secondary"}
              className="font-mono text-xs"
            >
              {filteredAssetsCount} / {totalAssetsCount}
            </Badge>
            <span>tập tin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
