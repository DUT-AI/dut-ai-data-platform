"use client";

import React, { useState, useRef, useEffect } from "react";
import { CheckCheck, Trash2, X, ChevronDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryOption } from "./tabular-label-cell";

interface TabularBulkActionBarProps {
  selectedCount: number;
  categories: CategoryOption[];
  categoryColors?: Record<string, string>;
  onApplyLabelToSelected: (categoryId: string) => void;
  onClearSelectedLabels: () => void;
  onDeselectAll: () => void;
}

export function TabularBulkActionBar({
  selectedCount,
  categories,
  categoryColors = {},
  onApplyLabelToSelected,
  onClearSelectedLabels,
  onDeselectAll,
}: TabularBulkActionBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (selectedCount === 0) return null;

  return (
    <div className="flex animate-in fade-in slide-in-from-bottom-2 items-center justify-between gap-3 border-t border-blue-900/50 bg-blue-950/90 px-4 py-2 text-xs text-blue-100 shadow-lg backdrop-blur-md">
      {/* Left: Selected count */}
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-blue-400" />
        <span className="font-semibold">
          Đang chọn <strong className="font-mono text-white">{selectedCount}</strong> dòng
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Bulk Label Dropdown */}
        <div className="relative" ref={menuRef}>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="h-7 gap-1.5 border border-blue-500/50 bg-blue-600 text-xs font-medium text-white hover:bg-blue-500"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Gán nhãn hàng loạt</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </Button>

          {isMenuOpen && (
            <div className="absolute bottom-full right-0 z-50 mb-1 max-h-56 w-52 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-1 shadow-2xl">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Chọn nhãn áp dụng
              </div>
              {categories.map((cat, idx) => {
                const color = cat.color || categoryColors[cat.id] || "#3b82f6";
                const shortcutNum = idx < 9 ? idx + 1 : null;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onApplyLabelToSelected(cat.id);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-slate-200 transition-colors hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    {shortcutNum && (
                      <kbd className="rounded bg-black/40 px-1 font-mono text-[9px] text-slate-400">
                        {shortcutNum}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Clear Labels Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearSelectedLabels}
          className="h-7 gap-1 border-slate-700 bg-slate-900/80 text-xs text-rose-300 hover:bg-rose-950/60 hover:text-rose-200"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Xóa nhãn</span>
        </Button>

        {/* Deselect All Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDeselectAll}
          className="h-7 text-xs text-slate-400 hover:bg-slate-900 hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          <span>Bỏ chọn</span>
        </Button>
      </div>
    </div>
  );
}
