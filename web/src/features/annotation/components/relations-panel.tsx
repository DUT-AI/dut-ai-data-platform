"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import type { AnnotationResult } from "../types";

export type RelationDirection = "left" | "right" | "bi";

export interface AnnotationRelation {
  id: string;
  fromId: string;
  toId: string;
  direction: RelationDirection;
  label?: string;
  visible?: boolean;
}

interface RelationsPanelProps {
  relations: AnnotationRelation[];
  results: AnnotationResult[];
  categoryNames: Record<string, string>;
  categoryColors: Record<string, string>;
  onAddRelation: (
    fromId: string,
    toId: string,
    direction?: RelationDirection,
    label?: string
  ) => void;
  onUpdateRelationDirection: (
    relationId: string,
    direction: RelationDirection
  ) => void;
  onDeleteRelation: (relationId: string) => void;
  onToggleRelationVisibility: (relationId: string) => void;
}

/**
 * Relations management panel between annotation regions
 * Adapted from Label Studio components/SidePanels/DetailsPanel/Relations.tsx
 */
export function RelationsPanel({
  relations,
  results,
  categoryNames,
  categoryColors,
  onAddRelation,
  onUpdateRelationDirection,
  onDeleteRelation,
  onToggleRelationVisibility,
}: RelationsPanelProps) {
  const [fromId, setFromId] = useState<string>("");
  const [toId, setToId] = useState<string>("");
  const [relationLabel, setRelationLabel] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  const getRegionName = (id: string) => {
    const res = results.find((r) => (r.id || r.output_id) === id);
    if (!res) return id;
    const cat =
      categoryNames[res.category_id || ""] || res.result_type || "Vùng";
    if (typeof res.value === "string")
      return `${cat} ("${res.value.substring(0, 10)}")`;
    return cat;
  };

  const getRegionColor = (id: string) => {
    const res = results.find((r) => (r.id || r.output_id) === id);
    return categoryColors[res?.category_id || ""] || "#3b82f6";
  };

  const handleCreateRelation = () => {
    if (!fromId || !toId || fromId === toId) return;
    onAddRelation(fromId, toId, "right", relationLabel || undefined);
    setFromId("");
    setToId("");
    setRelationLabel("");
    setIsCreating(false);
  };

  const rotateDirection = (current: RelationDirection): RelationDirection => {
    if (current === "right") return "bi";
    if (current === "bi") return "left";
    return "right";
  };

  const getDirectionIcon = (direction: RelationDirection) => {
    if (direction === "right") return "➔";
    if (direction === "left") return "⬅";
    return "⬄";
  };

  return (
    <div className="flex flex-col space-y-3 rounded-lg border border-slate-800 bg-slate-900/90 p-3 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Quan hệ liên kết ({relations.length})
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsCreating(!isCreating)}
          className="h-6 border-slate-700 px-2 text-[11px] text-slate-300"
        >
          {isCreating ? "Hủy" : "+ Thêm liên kết"}
        </Button>
      </div>

      {/* Relation Creation Form */}
      {isCreating && (
        <div className="space-y-2 rounded-md border border-slate-800 bg-slate-950 p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] text-slate-400">
                Từ vùng (From):
              </label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
              >
                <option value="">Chọn vùng nguồn...</option>
                {results.map((r) => {
                  const id = r.id || r.output_id || "";
                  return (
                    <option key={id} value={id}>
                      {getRegionName(id)}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] text-slate-400">
                Đến vùng (To):
              </label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
              >
                <option value="">Chọn vùng đích...</option>
                {results
                  .filter((r) => (r.id || r.output_id) !== fromId)
                  .map((r) => {
                    const id = r.id || r.output_id || "";
                    return (
                      <option key={id} value={id}>
                        {getRegionName(id)}
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] text-slate-400">
              Tên quan hệ (Tùy chọn):
            </label>
            <input
              type="text"
              placeholder="VD: part-of, cause, refer_to..."
              value={relationLabel}
              onChange={(e) => setRelationLabel(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
            />
          </div>

          <Button
            size="sm"
            onClick={handleCreateRelation}
            disabled={!fromId || !toId}
            className="h-7 w-full text-xs"
          >
            Tạo liên kết
          </Button>
        </div>
      )}

      {/* Relation List */}
      <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
        {relations.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-500">
            Chưa có mối liên kết quan hệ nào giữa các vùng.
          </div>
        ) : (
          relations.map((rel) => {
            const isHidden = rel.visible === false;
            return (
              <div
                key={rel.id}
                className={`flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 p-2 text-xs transition-colors ${
                  isHidden ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center space-x-1.5 truncate">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: getRegionColor(rel.fromId) }}
                  />
                  <span className="max-w-[80px] truncate font-mono text-[11px] text-slate-300">
                    {getRegionName(rel.fromId)}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateRelationDirection(
                        rel.id,
                        rotateDirection(rel.direction)
                      )
                    }
                    className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-blue-400 hover:bg-slate-700 hover:text-blue-300"
                    title="Click để đổi chiều liên kết"
                  >
                    {getDirectionIcon(rel.direction)}
                  </button>

                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: getRegionColor(rel.toId) }}
                  />
                  <span className="max-w-[80px] truncate font-mono text-[11px] text-slate-300">
                    {getRegionName(rel.toId)}
                  </span>

                  {rel.label && (
                    <span className="py-0.2 rounded border border-blue-900/60 bg-blue-950/40 px-1.5 text-[10px] text-blue-300">
                      {rel.label}
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => onToggleRelationVisibility(rel.id)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    title={isHidden ? "Hiện" : "Ẩn"}
                  >
                    {isHidden ? (
                      <EyeOff className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Eye className="size-3.5" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRelation(rel.id)}
                    className="rounded p-1 text-slate-400 hover:bg-red-950 hover:text-red-400"
                    title="Xóa liên kết"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
