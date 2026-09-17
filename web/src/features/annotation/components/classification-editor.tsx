"use client";

import React from "react";
import { AnnotationResult } from "../types";
import { CheckCircle2, Circle } from "lucide-react";

export interface ClassificationEditorProps {
  results: AnnotationResult[];
  outputId?: string;
  categoryColors?: Record<string, string>;
  categoryNames?: Record<string, string>;
  availableCategories?: Array<{
    id: string;
    name: string;
    color?: string | null;
    key: string;
  }>;
  multiple?: boolean;
  readOnly?: boolean;
  onChange?: (results: AnnotationResult[]) => void;
}

let classificationIdCounter = 0;
function generateClassificationId(catId: string): string {
  classificationIdCounter += 1;
  return `class_${catId}_${classificationIdCounter}`;
}

export function ClassificationEditor({
  results,
  outputId,
  availableCategories = [],
  multiple = false,
  readOnly = false,
  onChange,
}: ClassificationEditorProps) {
  const belongsToOutput = (result: AnnotationResult) =>
    !outputId || !result.output_id || result.output_id === outputId;

  // Extract currently selected category IDs from classification results
  const selectedCategoryIds = results
    .filter(
      (r) =>
        r.result_type === "classification" &&
        r.category_id &&
        belongsToOutput(r)
    )
    .map((r) => r.category_id as string);

  const handleToggleCategory = (catId: string) => {
    if (readOnly) return;

    if (multiple) {
      if (selectedCategoryIds.includes(catId)) {
        const updated = results.filter(
          (r) =>
            !(
              r.result_type === "classification" &&
              r.category_id === catId &&
              belongsToOutput(r)
            )
        );
        onChange?.(updated);
      } else {
        const newResult: AnnotationResult = {
          id: generateClassificationId(catId),
          output_id: outputId,
          result_type: "classification",
          category_id: catId,
          value: catId,
          created_at: new Date().toISOString(),
        };
        onChange?.([...results, newResult]);
      }
    } else {
      // Single choice
      const filtered = results.filter(
        (r) => r.result_type !== "classification" || !belongsToOutput(r)
      );
      if (selectedCategoryIds.includes(catId)) {
        onChange?.(filtered);
      } else {
        const newResult: AnnotationResult = {
          id: generateClassificationId(catId),
          output_id: outputId,
          result_type: "classification",
          category_id: catId,
          value: catId,
          created_at: new Date().toISOString(),
        };
        onChange?.([...filtered, newResult]);
      }
    }
  };

  return (
    <div className="flex flex-col space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1 text-xs">
        <span className="font-semibold text-slate-200">
          Phân Loại (Classification){" "}
          {multiple ? "- Nhiều lựa chọn" : "- Lựa chọn duy nhất"}
        </span>
        <span className="text-[11px] text-slate-400">
          {selectedCategoryIds.length} đã chọn
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2 lg:grid-cols-3">
        {availableCategories.map((cat) => {
          const isSelected = selectedCategoryIds.includes(cat.id);
          const color = cat.color || "#3b82f6";

          return (
            <button
              key={cat.id}
              type="button"
              disabled={readOnly}
              onClick={() => handleToggleCategory(cat.id)}
              style={{
                borderColor: isSelected ? color : "rgba(51, 65, 85, 0.6)",
                backgroundColor: isSelected
                  ? `${color}20`
                  : "rgba(15, 23, 42, 0.4)",
              }}
              className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                isSelected
                  ? "shadow-sm ring-1 ring-blue-500/40"
                  : "hover:border-slate-700 hover:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-medium text-slate-100">
                  {cat.name}
                </span>
              </div>
              {isSelected ? (
                <CheckCircle2 className="size-4 shrink-0 text-blue-400" />
              ) : (
                <Circle className="size-4 shrink-0 text-slate-600" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
