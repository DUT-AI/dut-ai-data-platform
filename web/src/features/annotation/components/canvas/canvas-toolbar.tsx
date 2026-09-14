"use client";

import React from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  MousePointer,
  Square,
  Hexagon,
  Dot,
  Trash2,
  Move,
  Check,
} from "lucide-react";
import { ToolMode } from "./types";

interface CanvasToolbarProps {
  currentTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  stageScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  selectedShapeId: string | null;
  readOnly?: boolean;
  onDeleteSelected: () => void;
  polygonPointsCount: number;
  onFinishPolygon: () => void;
}

export function CanvasToolbar({
  currentTool,
  onSelectTool,
  stageScale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  selectedShapeId,
  readOnly = false,
  onDeleteSelected,
  polygonPointsCount,
  onFinishPolygon,
}: CanvasToolbarProps) {
  return (
    <div className="absolute left-3 top-3 z-30 flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/90 p-1 shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={() => onSelectTool("select")}
        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
          currentTool === "select"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        }`}
        title="Chọn & Di chuyển (V)"
      >
        <MousePointer className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onSelectTool("bbox")}
        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
          currentTool === "bbox"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        }`}
        title="Vẽ Bounding Box (R)"
      >
        <Square className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onSelectTool("polygon")}
        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
          currentTool === "polygon"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        }`}
        title="Vẽ Đa Giác - Polygon (P)"
      >
        <Hexagon className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onSelectTool("point")}
        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
          currentTool === "point"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        }`}
        title="Chấm Điểm Mốc - Keypoint (K)"
      >
        <Dot className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onSelectTool("pan")}
        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
          currentTool === "pan"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        }`}
        title="Di chuyển Canvas (H)"
      >
        <Move className="size-4" />
      </button>

      {currentTool === "polygon" && polygonPointsCount >= 3 && (
        <button
          type="button"
          onClick={onFinishPolygon}
          className="flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
          title="Khép góc đa giác"
        >
          <Check className="size-3.5" />
          <span>Xong</span>
        </button>
      )}

      <div className="mx-1 h-4 w-px bg-slate-800" />

      {/* Zoom Controls */}
      <button
        type="button"
        onClick={onZoomIn}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        title="Phóng to (+)"
      >
        <ZoomIn className="size-4" />
      </button>
      {stageScale !== undefined && (
        <span className="select-none px-1 font-mono text-[11px] text-slate-400">
          {Math.round(stageScale * 100)}%
        </span>
      )}
      <button
        type="button"
        onClick={onZoomOut}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        title="Thu nhỏ (-)"
      >
        <ZoomOut className="size-4" />
      </button>
      <button
        type="button"
        onClick={onResetZoom}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        title="Vừa màn hình"
      >
        <Maximize2 className="size-4" />
      </button>

      {selectedShapeId && !readOnly && (
        <>
          <div className="mx-1 h-4 w-px bg-slate-800" />
          <button
            type="button"
            onClick={onDeleteSelected}
            className="flex h-8 w-8 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-red-950/80 hover:text-red-300"
            title="Xóa vùng chọn (Delete/Backspace)"
          >
            <Trash2 className="size-4" />
          </button>
        </>
      )}
    </div>
  );
}
