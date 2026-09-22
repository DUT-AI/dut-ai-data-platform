"use client";

import React, { useState, useMemo } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import type { AnnotationResult } from "../types";

export type GroupByOption = "none" | "category" | "type";
export type SortByOption = "index" | "category" | "recent";

interface OutlinerPanelProps {
  results: AnnotationResult[];
  selectedId: string | null;
  categoryNames: Record<string, string>;
  categoryColors: Record<string, string>;
  hiddenResultIds: Set<string>;
  onSelectResult: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDeleteResult: (id: string) => void;
  onUpdateCategory?: (id: string, newCategoryId: string) => void;
}

/**
 * Outliner Panel for regions and results management
 * Adapted from Label Studio components/SidePanels/OutlinerPanel/OutlinerPanel.tsx
 */
export function OutlinerPanel({
  results,
  selectedId,
  categoryNames,
  categoryColors,
  hiddenResultIds,
  onSelectResult,
  onToggleVisibility,
  onDeleteResult,
}: OutlinerPanelProps) {
  const [groupBy, setGroupBy] = useState<GroupByOption>("category");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return results;
    const q = searchQuery.toLowerCase();
    return results.filter((res) => {
      const catName = (
        categoryNames[res.category_id || ""] || ""
      ).toLowerCase();
      const type = (res.result_type || "").toLowerCase();
      const val = typeof res.value === "string" ? res.value.toLowerCase() : "";
      return catName.includes(q) || type.includes(q) || val.includes(q);
    });
  }, [results, searchQuery, categoryNames]);

  const groupedMap = useMemo(() => {
    const map: Record<string, AnnotationResult[]> = {};
    filteredResults.forEach((res) => {
      let key = "Vùng gán nhãn";
      if (groupBy === "category") {
        key = categoryNames[res.category_id || ""] || "Chưa phân loại";
      } else if (groupBy === "type") {
        key = res.result_type || "Khác";
      }
      if (!map[key]) map[key] = [];
      map[key].push(res);
    });
    return map;
  }, [filteredResults, groupBy, categoryNames]);

  return (
    <div className="flex flex-col space-y-3 rounded-lg border border-slate-800 bg-slate-900/90 p-3 shadow-md">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Cấu trúc nhãn ({results.length})
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="category">Nhóm: Nhãn</option>
            <option value="type">Nhóm: Loại</option>
            <option value="none">Không nhóm</option>
          </select>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <input
        type="text"
        placeholder="Lọc danh sách vùng..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
      />

      {/* Results Tree List */}
      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {results.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            Chưa có vùng gán nhãn nào được tạo.
          </div>
        ) : Object.keys(groupedMap).length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-500">
            Không tìm thấy kết quả phù hợp.
          </div>
        ) : (
          Object.entries(groupedMap).map(([groupName, items]) => (
            <div key={groupName} className="space-y-1">
              {groupBy !== "none" && (
                <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-400">
                  <span>{groupName}</span>
                  <span className="py-0.2 rounded bg-slate-800 px-1.5 font-mono text-[10px]">
                    {items.length}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                {items.map((res, index) => {
                  const id = res.id || res.output_id || `res_${index}`;
                  const isSelected = selectedId === id;
                  const isHidden = hiddenResultIds.has(id);
                  const color =
                    categoryColors[res.category_id || ""] || "#3b82f6";
                  const labelName =
                    categoryNames[res.category_id || ""] ||
                    res.result_type ||
                    "Vùng";

                  return (
                    <div
                      key={id}
                      onClick={() => onSelectResult(id)}
                      className={`group flex cursor-pointer items-center justify-between rounded-md border p-1.5 transition-colors duration-150 ${
                        isSelected
                          ? "border-blue-500 bg-blue-950/40 text-blue-200"
                          : "border-slate-800/80 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50"
                      } ${isHidden ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate font-mono text-xs font-medium">
                          {labelName}
                        </span>
                        {typeof res.value === "string" && (
                          <span className="max-w-[100px] truncate font-sans text-[11px] text-slate-400">
                            &quot;{res.value}&quot;
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100">
                        {/* Toggle Visibility */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility(id);
                          }}
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                          title={isHidden ? "Hiện vùng" : "Ẩn vùng"}
                        >
                          {isHidden ? (
                            <EyeOff className="size-3.5" aria-hidden="true" />
                          ) : (
                            <Eye className="size-3.5" aria-hidden="true" />
                          )}
                        </button>

                        {/* Delete Region */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteResult(id);
                          }}
                          className="rounded p-1 text-slate-400 hover:bg-red-950 hover:text-red-400"
                          title="Xóa vùng"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
