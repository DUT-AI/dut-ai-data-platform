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
}

/**
 * Top category legend and active drawing label selector
 */
export function WorkspaceCategoryBar({
  categories,
  activeCategoryId,
  onSelectCategory,
}: WorkspaceCategoryBarProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="flex shrink-0 select-none flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
              <span className="rounded bg-black/40 px-1 font-mono text-[10px] text-slate-400">
                {shortcutNum}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
