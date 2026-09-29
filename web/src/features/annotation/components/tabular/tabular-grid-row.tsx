"use client";

import React, { memo } from "react";
import { TabularRow, TabularRecordResult, TabularLabelMode } from "./tabular-types";
import { TabularDataCell } from "./tabular-data-cell";
import { TabularLabelCell, CategoryOption } from "./tabular-label-cell";

interface TabularGridRowProps {
  row: TabularRow;
  rowIndex: number;
  displayIndex: number;
  keyField: string;
  recordKey: string;
  visibleHeaders: string[];
  currentResult?: TabularRecordResult;
  categories: CategoryOption[];
  categoryColors?: Record<string, string>;
  categoryNames?: Record<string, string>;
  labelMode: TabularLabelMode;
  isSelected: boolean;
  isFocused: boolean;
  readOnly?: boolean;
  searchHighlight?: string;
  onSelectRow: (recordKey: string, isShift: boolean) => void;
  onFocusRow: (recordKey: string) => void;
  onSelectCategory: (recordKey: string, categoryId: string) => void;
  onToggleMultiCategory?: (recordKey: string, categoryId: string) => void;
  onSetNumericValue?: (recordKey: string, val: number | null) => void;
  onClearLabel: (recordKey: string) => void;
}

export const TabularGridRow = memo(function TabularGridRow({
  row,
  displayIndex,
  keyField,
  recordKey,
  visibleHeaders,
  currentResult,
  categories,
  categoryColors,
  categoryNames,
  labelMode,
  isSelected,
  isFocused,
  readOnly = false,
  searchHighlight,
  onSelectRow,
  onFocusRow,
  onSelectCategory,
  onToggleMultiCategory,
  onSetNumericValue,
  onClearLabel,
}: TabularGridRowProps) {
  const isLabeled =
    labelMode === "number"
      ? currentResult?.value !== undefined && currentResult?.value !== null
      : !!currentResult?.category_id ||
        (Array.isArray(currentResult?.value) &&
          (currentResult.value as string[]).length > 0);

  return (
    <tr
      onClick={() => onFocusRow(recordKey)}
      tabIndex={0}
      className={`group transition-colors outline-hidden ${
        isFocused
          ? "bg-blue-950/30 ring-1 ring-inset ring-blue-500/40"
          : isSelected
            ? "bg-slate-900/70"
            : isLabeled
              ? "bg-slate-950/60 hover:bg-slate-900/40"
              : "hover:bg-slate-900/30"
      }`}
    >
      {/* 1. Selection Checkbox */}
      <td
        className="sticky left-0 z-10 w-10 border-b border-slate-800 bg-slate-950/95 px-2 py-2 text-center backdrop-blur-xs group-hover:bg-slate-900/95"
        onClick={(e) => {
          e.stopPropagation();
          onSelectRow(recordKey, e.shiftKey);
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          className="size-3.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-950 cursor-pointer"
        />
      </td>

      {/* 2. Row sequence index */}
      <td className="w-12 border-b border-slate-800/80 px-2 py-2 text-center font-mono text-[10px] text-slate-500">
        {displayIndex}
      </td>

      {/* 3. Pinned Record ID Column */}
      <td className="sticky left-10 z-10 max-w-[140px] truncate border-b border-slate-800 bg-slate-950/95 px-3 py-2 font-mono text-xs font-semibold text-slate-200 backdrop-blur-xs group-hover:bg-slate-900/95">
        <span
          title={recordKey}
          className="rounded-xs bg-slate-900 px-1.5 py-0.5 text-[11px] text-blue-300"
        >
          {recordKey}
        </span>
      </td>

      {/* 4. Visible Data Feature Columns */}
      {visibleHeaders
        .filter((col) => col !== keyField)
        .map((col) => (
          <td
            key={col}
            className="border-b border-slate-800/60 px-3 py-2 text-xs"
          >
            <TabularDataCell
              value={row[col]}
              searchHighlight={searchHighlight}
            />
          </td>
        ))}

      {/* 5. Sticky Pinned Target Label Column */}
      <td className="sticky right-0 z-10 min-w-[160px] border-b border-slate-800 bg-slate-950/95 px-3 py-2 backdrop-blur-xs group-hover:bg-slate-900/95">
        <TabularLabelCell
          recordKey={recordKey}
          currentResult={currentResult}
          categories={categories}
          categoryColors={categoryColors}
          categoryNames={categoryNames}
          labelMode={labelMode}
          readOnly={readOnly}
          onSelectCategory={onSelectCategory}
          onToggleMultiCategory={onToggleMultiCategory}
          onSetNumericValue={onSetNumericValue}
          onClearLabel={onClearLabel}
        />
      </td>
    </tr>
  );
});
