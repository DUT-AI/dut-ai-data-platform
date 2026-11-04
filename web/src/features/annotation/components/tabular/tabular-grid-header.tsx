"use client";

import React, { useRef, useEffect } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Key } from "lucide-react";
import { TabularSortConfig } from "./tabular-types";

interface TabularGridHeaderProps {
  keyField: string;
  isKeyFieldSynthetic: boolean;
  visibleHeaders: string[];
  allPageRowsSelected: boolean;
  somePageRowsSelected: boolean;
  sortConfig: TabularSortConfig | null;
  onToggleSelectAllPage: () => void;
  onSortColumn: (column: string) => void;
}

export function TabularGridHeader({
  keyField,
  isKeyFieldSynthetic,
  visibleHeaders,
  allPageRowsSelected,
  somePageRowsSelected,
  sortConfig,
  onToggleSelectAllPage,
  onSortColumn,
}: TabularGridHeaderProps) {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = somePageRowsSelected;
    }
  }, [somePageRowsSelected]);

  return (
    <thead className="shadow-xs sticky top-0 z-20 bg-slate-900 font-mono text-[11px] uppercase tracking-wider text-slate-400">
      <tr>
        {/* 1. Select All Checkbox */}
        <th className="sticky left-0 z-30 w-10 border-b border-slate-800 bg-slate-900 px-2 py-2.5 text-center">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={allPageRowsSelected}
            onChange={onToggleSelectAllPage}
            className="size-3.5 cursor-pointer rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
            title="Chọn tất cả dòng trên trang"
          />
        </th>

        {/* 2. Row # */}
        <th className="w-12 border-b border-slate-800 bg-slate-900 px-2 py-2.5 text-center text-slate-500">
          #
        </th>

        {/* 3. Pinned Key Field Header */}
        <th
          onClick={() => onSortColumn(keyField)}
          className="sticky left-10 z-30 min-w-[140px] cursor-pointer select-none border-b border-slate-800 bg-slate-900 px-3 py-2.5 text-left text-blue-400 hover:text-blue-300"
        >
          <div className="flex items-center gap-1.5">
            <Key className="h-3 w-3" />
            <span>{keyField}</span>
            {isKeyFieldSynthetic && (
              <span className="rounded-xs bg-slate-800 px-1 text-[9px] lowercase text-amber-400">
                (auto)
              </span>
            )}
            {sortConfig?.column === keyField ? (
              sortConfig.direction === "asc" ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-30 hover:opacity-100" />
            )}
          </div>
        </th>

        {/* 4. Visible Data Feature Column Headers */}
        {visibleHeaders
          .filter((col) => col !== keyField)
          .map((col) => {
            const isSorted = sortConfig?.column === col;
            return (
              <th
                key={col}
                onClick={() => onSortColumn(col)}
                className="cursor-pointer select-none border-b border-slate-800 px-3 py-2.5 text-left hover:text-slate-200"
              >
                <div className="flex items-center gap-1.5">
                  <span className="max-w-[180px] truncate">{col}</span>
                  {isSorted ? (
                    sortConfig.direction === "asc" ? (
                      <ArrowUp className="h-3 w-3 text-blue-400" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-blue-400" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-25 hover:opacity-100" />
                  )}
                </div>
              </th>
            );
          })}

        {/* 5. Sticky Pinned Target Label Header */}
        <th className="sticky right-0 z-30 min-w-[160px] border-b border-slate-800 bg-slate-900 px-3 py-2.5 text-left font-semibold text-emerald-400">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Nhãn (Target Label)</span>
          </div>
        </th>
      </tr>
    </thead>
  );
}
