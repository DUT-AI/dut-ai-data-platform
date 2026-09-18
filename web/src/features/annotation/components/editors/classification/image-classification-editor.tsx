"use client";

import React, { useRef, useMemo } from "react";
import { BaseEditorComponentProps } from "../../../registry/editor-registry";
import { useImageTransform } from "../../../hooks/use-image-transform";
import { ImageStage, EditorToolbar, EditorFooter } from "../shared";
import { AnnotationResult } from "../../../types";
import { Tag, CheckCircle2, AlertCircle } from "lucide-react";

export function ImageClassificationEditor({
  assetUrl,
  results,
  categoryColors = {},
  categoryNames = {},
  selectedCategoryId,
  availableCategories = [],
  readOnly = false,
  onChange,
}: BaseEditorComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  const {
    dimensions,
    naturalDimensions,
    imageObj,
    imageLayout,
    stageScale,
    stagePos,
    handleWheel,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useImageTransform({
    imageUrl: assetUrl,
    containerRef,
  });

  // Current active classification from results
  const currentClassification = useMemo(() => {
    return results.find((r) => r.result_type === "classification" && r.category_id);
  }, [results]);

  const assignedCategoryId = currentClassification?.category_id || null;
  const assignedCategoryName = assignedCategoryId
    ? categoryNames[assignedCategoryId] || assignedCategoryId
    : null;
  const assignedCategoryColor = assignedCategoryId
    ? categoryColors[assignedCategoryId] || "#3B82F6"
    : null;

  // Handle unlabel / remove classification
  const handleRemoveClassification = () => {
    if (readOnly) return;
    const updated = results.filter((r) => r.result_type !== "classification");
    onChange?.(updated);
  };

  // When selectedCategoryId changes from Workspace, update classification result
  React.useEffect(() => {
    if (readOnly) return;
    if (selectedCategoryId && selectedCategoryId !== assignedCategoryId) {
      const filtered = results.filter((r) => r.result_type !== "classification");
      const newResult: AnnotationResult = {
        id: `class_${selectedCategoryId}_${Date.now()}`,
        result_type: "classification",
        category_id: selectedCategoryId,
        value: selectedCategoryId,
        created_at: new Date().toISOString(),
      };
      onChange?.([...filtered, newResult]);
    }
  }, [selectedCategoryId, assignedCategoryId, readOnly, results, onChange]);

  return (
    <div className="relative flex h-full min-h-[420px] w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      {/* Floating Toolbar with Zoom/Pan */}
      <EditorToolbar
        currentTool="pan"
        onSelectTool={() => {}}
        stageScale={stageScale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        readOnly={readOnly}
      />

      {/* Floating Classification Status Badge (Top-Right) */}
      <div className="absolute right-3 top-3 z-30 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 shadow-lg backdrop-blur">
        <Tag className="size-4 text-slate-400" />
        <span className="text-xs text-slate-400">Phân loại ảnh:</span>
        {assignedCategoryName ? (
          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: assignedCategoryColor || "#3B82F6" }}
            />
            <span
              className="text-xs font-bold"
              style={{ color: assignedCategoryColor || "#3B82F6" }}
            >
              {assignedCategoryName}
            </span>
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            {!readOnly && (
              <button
                type="button"
                onClick={handleRemoveClassification}
                className="ml-1 text-[11px] text-slate-500 hover:text-red-400"
                title="Bỏ gán nhãn"
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <AlertCircle className="size-3.5" />
            <span>Chưa gắn nhãn (Chọn nhãn trên thanh công cụ)</span>
          </div>
        )}
      </div>

      {/* Central Viewport */}
      <div ref={containerRef} className="relative h-full w-full flex-1">
        <ImageStage
          ref={stageRef}
          dimensions={dimensions}
          stageScale={stageScale}
          stagePos={stagePos}
          imageObj={imageObj}
          imageLayout={imageLayout}
          draggable={true}
          cursorClass="cursor-grab active:cursor-grabbing"
          onWheel={(e) => handleWheel(e, stageRef.current)}
        />
      </div>

      {/* Footer Info */}
      <EditorFooter
        currentTool="pan"
        resultsCount={assignedCategoryId ? 1 : 0}
        stageScale={stageScale}
        naturalDimensions={naturalDimensions}
      />
    </div>
  );
}
