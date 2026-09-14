"use client";

import React from "react";

export interface CategoryItem {
  id: string;
  name: string;
  color?: string | null;
  key: string;
}

interface WorkspaceCategoryBarProps {
  categories: CategoryItem[];
  activeCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  onSaveRevision?: () => void;
  isSubmitting?: boolean;
  onOpenHotkeySettings?: () => void;
  onOpenInstructions?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
}

/**
 * Top category legend, active drawing label selector, and quick workspace actions
 */
export function WorkspaceCategoryBar({
  categories,
  activeCategoryId,
  onSelectCategory,
  onSaveRevision,
  isSubmitting = false,
  onOpenHotkeySettings,
  onOpenInstructions,
  hasPrev,
  hasNext,
  onNavigatePrev,
  onNavigateNext,
}: WorkspaceCategoryBarProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="flex shrink-0 select-none items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 shadow-sm">
      {/* Left: Category items */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Chọn nhãn vẽ:
        </span>
        {categories.map((cat, idx) => {
          const color = cat.color || "#3b82f6";
          const isSelected = activeCategoryId === cat.id;
          const shortcutNum = idx < 9 ? idx + 1 : null;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              style={{
                backgroundColor: isSelected ? `${color}35` : `${color}15`,
                borderColor: isSelected ? color : `${color}60`,
                color: color,
              }}
              className={`flex items-center space-x-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all ${
                isSelected
                  ? "scale-[1.03] ring-2 ring-blue-500/50"
                  : "opacity-80 hover:opacity-100"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>{cat.name}</span>
              {shortcutNum && (
                <kbd className="rounded bg-black/40 px-1 font-mono text-[10px] text-slate-400">
                  {shortcutNum}
                </kbd>
              )}
            </button>
          );
        })}
      </div>

      {/* Right: Quick Action Buttons */}
      <div className="flex shrink-0 items-center gap-2">
        {onNavigatePrev && hasPrev && (
          <button
            type="button"
            onClick={onNavigatePrev}
            className="flex h-7 items-center rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-300 transition-colors hover:bg-slate-800"
            title="Ảnh trước ([)"
          >
            ◀
          </button>
        )}
        {onNavigateNext && hasNext && (
          <button
            type="button"
            onClick={onNavigateNext}
            className="flex h-7 items-center rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-300 transition-colors hover:bg-slate-800"
            title="Ảnh sau (])"
          >
            ▶
          </button>
        )}

        {onOpenHotkeySettings && (
          <button
            type="button"
            onClick={onOpenHotkeySettings}
            className="flex h-7 items-center gap-1 rounded border border-slate-800 bg-slate-950 px-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            title="Xem danh sách phím tắt"
          >
            <span>⌨️ Phím tắt</span>
          </button>
        )}

        {onOpenInstructions && (
          <button
            type="button"
            onClick={onOpenInstructions}
            className="flex h-7 items-center gap-1 rounded border border-slate-800 bg-slate-950 px-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            title="Hướng dẫn gán nhãn (H)"
          >
            <span>📖 Hướng dẫn</span>
          </button>
        )}

        {onSaveRevision && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onSaveRevision}
            className="flex h-7 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-500 disabled:opacity-50"
            title="Lưu phiên bản (Ctrl+S / Cmd+S)"
          >
            <span>💾 {isSubmitting ? "Đang lưu..." : "Lưu (Ctrl+S)"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
