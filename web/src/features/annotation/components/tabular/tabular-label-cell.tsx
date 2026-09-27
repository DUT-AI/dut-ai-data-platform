"use client";

import React, { useState, useRef, useEffect, memo } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { TabularRecordResult, TabularLabelMode } from "./tabular-types";

export interface CategoryOption {
  id: string;
  name: string;
  color?: string | null;
  key: string;
}

interface TabularLabelCellProps {
  recordKey: string;
  currentResult?: TabularRecordResult;
  categories: CategoryOption[];
  categoryColors?: Record<string, string>;
  categoryNames?: Record<string, string>;
  labelMode: TabularLabelMode;
  readOnly?: boolean;
  onSelectCategory: (recordKey: string, categoryId: string) => void;
  onToggleMultiCategory?: (recordKey: string, categoryId: string) => void;
  onSetNumericValue?: (recordKey: string, val: number | null) => void;
  onClearLabel: (recordKey: string) => void;
}

export const TabularLabelCell = memo(function TabularLabelCell({
  recordKey,
  currentResult,
  categories,
  categoryColors = {},
  categoryNames = {},
  labelMode,
  readOnly = false,
  onSelectCategory,
  onToggleMultiCategory,
  onSetNumericValue,
  onClearLabel,
}: TabularLabelCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [numInput, setNumInput] = useState<string>(
    currentResult?.value !== undefined && currentResult?.value !== null
      ? String(currentResult.value)
      : ""
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Keep number input in sync
  useEffect(() => {
    if (labelMode === "number") {
      setNumInput(
        currentResult?.value !== undefined && currentResult?.value !== null
          ? String(currentResult.value)
          : ""
      );
    }
  }, [currentResult?.value, labelMode]);

  const assignedCategoryId = currentResult?.category_id || null;
  const multiCategoryIds = Array.isArray(currentResult?.value)
    ? (currentResult?.value as string[])
    : assignedCategoryId
      ? [assignedCategoryId]
      : [];

  const isLabeled =
    labelMode === "number"
      ? currentResult?.value !== undefined && currentResult?.value !== null
      : labelMode === "multi-label"
        ? multiCategoryIds.length > 0
        : !!assignedCategoryId;

  // 1. Number Mode
  if (labelMode === "number") {
    const handleNumBlur = () => {
      if (readOnly) return;
      const parsed = parseFloat(numInput);
      if (numInput.trim() === "" || isNaN(parsed)) {
        onSetNumericValue?.(recordKey, null);
      } else {
        onSetNumericValue?.(recordKey, parsed);
      }
    };

    const handleNumKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    };

    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step="any"
          disabled={readOnly}
          value={numInput}
          onChange={(e) => setNumInput(e.target.value)}
          onBlur={handleNumBlur}
          onKeyDown={handleNumKeyDown}
          placeholder="Nhập số..."
          className="h-7 w-28 rounded border border-slate-700 bg-slate-900 px-2 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-hidden disabled:opacity-50"
        />
        {isLabeled && !readOnly && (
          <button
            type="button"
            onClick={() => {
              setNumInput("");
              onClearLabel(recordKey);
            }}
            title="Xóa nhãn"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-rose-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  // 2. Binary or <= 3 Categories: Pill Buttons inline
  if ((labelMode === "binary" || categories.length <= 3) && labelMode !== "multi-label") {
    return (
      <div className="flex items-center gap-1">
        {categories.map((cat, idx) => {
          const isSelected = assignedCategoryId === cat.id;
          const color = cat.color || categoryColors[cat.id] || "#3b82f6";
          const shortcutNum = idx < 9 ? idx + 1 : null;

          return (
            <button
              key={cat.id}
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (isSelected) {
                  onClearLabel(recordKey);
                } else {
                  onSelectCategory(recordKey, cat.id);
                }
              }}
              style={{
                backgroundColor: isSelected ? `${color}35` : "transparent",
                borderColor: isSelected ? color : "#334155",
                color: isSelected ? color : "#94a3b8",
              }}
              className={`group flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors ${
                isSelected
                  ? "font-semibold shadow-xs"
                  : "hover:border-slate-600 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="truncate max-w-[80px]">{cat.name}</span>
              {shortcutNum && (
                <span className="font-mono text-[9px] opacity-40 group-hover:opacity-80">
                  {shortcutNum}
                </span>
              )}
            </button>
          );
        })}

        {isLabeled && !readOnly && (
          <button
            type="button"
            onClick={() => onClearLabel(recordKey)}
            title="Xóa nhãn"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-800 hover:text-rose-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  // 3. Multi-label mode
  if (labelMode === "multi-label") {
    return (
      <div className="relative inline-block" ref={dropdownRef}>
        <div className="flex flex-wrap items-center gap-1">
          {multiCategoryIds.map((catId) => {
            const catName = categoryNames[catId] || catId;
            const color = categoryColors[catId] || "#3b82f6";
            return (
              <span
                key={catId}
                style={{
                  backgroundColor: `${color}25`,
                  borderColor: color,
                  color: color,
                }}
                className="flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="max-w-[80px] truncate">{catName}</span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMultiCategory?.(recordKey, catId);
                    }}
                    className="hover:opacity-80"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </span>
            );
          })}

          {!readOnly && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex h-6 items-center gap-1 rounded border border-dashed border-slate-700 bg-slate-900/60 px-1.5 text-[10px] text-slate-400 hover:border-slate-500 hover:text-slate-200"
            >
              <Plus className="h-3 w-3" />
              <span>Gán nhãn</span>
            </button>
          )}
        </div>

        {/* Dropdown Menu */}
        {isOpen && !readOnly && (
          <div className="absolute right-0 top-full z-50 mt-1 max-h-56 w-48 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-1 shadow-xl">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Chọn các nhãn
            </div>
            {categories.map((cat) => {
              const isSelected = multiCategoryIds.includes(cat.id);
              const color = cat.color || categoryColors[cat.id] || "#3b82f6";

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onToggleMultiCategory?.(recordKey, cat.id)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-900"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-blue-400" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 4. Default: Multi-class Single-label Dropdown Popover
  const activeCat = categories.find((c) => c.id === assignedCategoryId);
  const activeColor =
    activeCat?.color ||
    (assignedCategoryId ? categoryColors[assignedCategoryId] : undefined) ||
    "#3b82f6";
  const activeName =
    activeCat?.name ||
    (assignedCategoryId ? categoryNames[assignedCategoryId] : undefined) ||
    "Tag";

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div className="flex items-center gap-1">
        {assignedCategoryId ? (
          <button
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && setIsOpen(!isOpen)}
            style={{
              backgroundColor: `${activeColor}25`,
              borderColor: activeColor,
              color: activeColor,
            }}
            className="flex h-7 items-center gap-1.5 rounded-md border px-2 font-mono text-[11px] font-semibold transition-colors hover:brightness-110"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: activeColor }}
            />
            <span className="max-w-[110px] truncate">{activeName}</span>
            {!readOnly && <ChevronDown className="h-3 w-3 opacity-60" />}
          </button>
        ) : (
          <button
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && setIsOpen(!isOpen)}
            className="flex h-7 items-center gap-1 rounded-md border border-dashed border-slate-700 bg-slate-900/50 px-2 text-[11px] text-slate-400 hover:border-slate-500 hover:bg-slate-900 hover:text-slate-200"
          >
            <Plus className="h-3 w-3" />
            <span>Chọn nhãn...</span>
            <ChevronDown className="h-3 w-3 opacity-40" />
          </button>
        )}

        {isLabeled && !readOnly && (
          <button
            type="button"
            onClick={() => onClearLabel(recordKey)}
            title="Xóa nhãn"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-800 hover:text-rose-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Popover Dropdown */}
      {isOpen && !readOnly && (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-60 w-52 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-1 shadow-2xl">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Chọn danh mục (1–9)
          </div>
          {categories.map((cat, idx) => {
            const isSelected = assignedCategoryId === cat.id;
            const color = cat.color || categoryColors[cat.id] || "#3b82f6";
            const shortcutNum = idx < 9 ? idx + 1 : null;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onSelectCategory(recordKey, cat.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-blue-950/60 text-blue-300 font-semibold"
                    : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate">{cat.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {shortcutNum && (
                    <kbd className="rounded bg-black/40 px-1 font-mono text-[9px] text-slate-400">
                      {shortcutNum}
                    </kbd>
                  )}
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-blue-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
