"use client";

import React, { useCallback, useRef } from "react";
import { TabularRow, TabularRecordResult, TabularLabelMode, TabularSortConfig } from "./tabular-types";
import { TabularGridHeader } from "./tabular-grid-header";
import { TabularGridRow } from "./tabular-grid-row";
import { TabularEmptyGrid } from "./tabular-empty-grid";
import { CategoryOption } from "./tabular-label-cell";

interface TabularDataGridProps {
  pageRows: TabularRow[];
  totalRowCount: number;
  filteredRowCount: number;
  pageStartIndex: number;
  headers: string[];
  visibleHeaders: string[];
  keyField: string;
  isKeyFieldSynthetic: boolean;
  rowResultMap: Map<string, TabularRecordResult>;
  categories: CategoryOption[];
  categoryColors?: Record<string, string>;
  categoryNames?: Record<string, string>;
  labelMode: TabularLabelMode;
  selectedRowKeys: Set<string>;
  focusedRowKey: string | null;
  sortConfig: TabularSortConfig | null;
  searchHighlight?: string;
  readOnly?: boolean;
  isLoading?: boolean;
  errorMessage?: string;
  onSelectRow: (recordKey: string, isShift: boolean) => void;
  onToggleSelectAllPage: () => void;
  onFocusRow: (recordKey: string) => void;
  onSortColumn: (column: string) => void;
  onSelectCategory: (recordKey: string, categoryId: string) => void;
  onToggleMultiCategory?: (recordKey: string, categoryId: string) => void;
  onSetNumericValue?: (recordKey: string, val: number | null) => void;
  onClearLabel: (recordKey: string) => void;
  onResetFilters?: () => void;
  onRetry?: () => void;
}

export function TabularDataGrid({
  pageRows,
  totalRowCount,
  filteredRowCount,
  pageStartIndex,
  visibleHeaders,
  keyField,
  isKeyFieldSynthetic,
  rowResultMap,
  categories,
  categoryColors,
  categoryNames,
  labelMode,
  selectedRowKeys,
  focusedRowKey,
  sortConfig,
  searchHighlight,
  readOnly = false,
  isLoading = false,
  errorMessage,
  onSelectRow,
  onToggleSelectAllPage,
  onFocusRow,
  onSortColumn,
  onSelectCategory,
  onToggleMultiCategory,
  onSetNumericValue,
  onClearLabel,
  onResetFilters,
  onRetry,
}: TabularDataGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to extract recordKey for a row
  const getRecordKey = useCallback(
    (row: TabularRow, rIdx: number): string => {
      const val = row[keyField];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val);
      }
      return `row_${pageStartIndex + rIdx + 1}`;
    },
    [keyField, pageStartIndex]
  );

  // Calculate select-all page state
  const pageRowKeys = pageRows.map((r, i) => getRecordKey(r, i));
  const selectedOnPageCount = pageRowKeys.filter((k) =>
    selectedRowKeys.has(k)
  ).length;
  const allPageRowsSelected =
    pageRows.length > 0 && selectedOnPageCount === pageRows.length;
  const somePageRowsSelected =
    selectedOnPageCount > 0 && selectedOnPageCount < pageRows.length;

  if (isLoading) {
    return (
      <div className="flex h-72 w-full flex-col items-center justify-center space-y-3">
        <div className="h-7 w-7 animate-spin rounded-full border-3 border-slate-700 border-t-blue-500" />
        <span className="font-mono text-xs text-slate-400">
          Đang đọc và hiển thị dữ liệu bảng...
        </span>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <TabularEmptyGrid
        type="error"
        errorMessage={errorMessage}
        onRetry={onRetry}
      />
    );
  }

  if (totalRowCount === 0) {
    return <TabularEmptyGrid type="empty-file" />;
  }

  if (filteredRowCount === 0) {
    return (
      <TabularEmptyGrid
        type="no-results"
        onResetFilters={onResetFilters}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-auto rounded-lg border border-slate-800 bg-slate-950"
    >
      <table className="w-full border-separate border-spacing-0 text-left text-xs">
        <TabularGridHeader
          keyField={keyField}
          isKeyFieldSynthetic={isKeyFieldSynthetic}
          visibleHeaders={visibleHeaders}
          allPageRowsSelected={allPageRowsSelected}
          somePageRowsSelected={somePageRowsSelected}
          sortConfig={sortConfig}
          onToggleSelectAllPage={onToggleSelectAllPage}
          onSortColumn={onSortColumn}
        />
        <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
          {pageRows.map((row, idx) => {
            const recordKey = getRecordKey(row, idx);
            const currentResult = rowResultMap.get(recordKey);
            const isSelected = selectedRowKeys.has(recordKey);
            const isFocused = focusedRowKey === recordKey;

            return (
              <TabularGridRow
                key={recordKey}
                row={row}
                rowIndex={idx}
                displayIndex={pageStartIndex + idx + 1}
                keyField={keyField}
                recordKey={recordKey}
                visibleHeaders={visibleHeaders}
                currentResult={currentResult}
                categories={categories}
                categoryColors={categoryColors}
                categoryNames={categoryNames}
                labelMode={labelMode}
                isSelected={isSelected}
                isFocused={isFocused}
                readOnly={readOnly}
                searchHighlight={searchHighlight}
                onSelectRow={onSelectRow}
                onFocusRow={onFocusRow}
                onSelectCategory={onSelectCategory}
                onToggleMultiCategory={onToggleMultiCategory}
                onSetNumericValue={onSetNumericValue}
                onClearLabel={onClearLabel}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
