"use client";

import React from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  MousePointer,
  Move,
  Trash2,
} from "lucide-react";

export interface EditorToolbarProps {
  currentTool: string;
  onSelectTool: (tool: string) => void;
  stageScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  selectedShapeId?: string | null;
  readOnly?: boolean;
  onDeleteSelected?: () => void;
  children?: React.ReactNode;
}

export function EditorToolbar({
  currentTool,
  onSelectTool,
  stageScale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  selectedShapeId,
  readOnly = false,
  onDeleteSelected,
  children,
}: EditorToolbarProps) {
  return (
    <div className="absolute left-3 top-3 z-30 flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/90 p-1 shadow-lg backdrop-blur">
      {/* Standard Select Tool */}
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

      {/* Standard Pan Tool */}
      <button
        type="button"
        onClick={() => onSelectTool("pan")}
        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
          currentTool === "pan"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        }`}
        title="Di chuyển Khung vẽ - Pan (Space / H)"
      >
        <Move className="size-4" />
      </button>

      {/* Editor-specific Tools (e.g. BBox, Polygon, Brush, Eraser) */}
      {children}

      <div className="mx-1 h-4 w-px bg-slate-800" />

      {/* Standard Zoom Controls */}
      <button
        type="button"
        onClick={onZoomIn}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        title="Phóng to (+)"
      >
        <ZoomIn className="size-4" />
      </button>
      <span className="select-none px-1 font-mono text-[11px] text-slate-400">
        {Math.round(stageScale * 100)}%
      </span>
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
        title="Vừa màn hình (Shift+1)"
      >
        <Maximize2 className="size-4" />
      </button>

      {/* Delete Selection */}
      {selectedShapeId && !readOnly && onDeleteSelected && (
        <>
          <div className="mx-1 h-4 w-px bg-slate-800" />
          <button
            type="button"
            onClick={onDeleteSelected}
            className="flex h-8 w-8 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-red-950/80 hover:text-red-300"
            title="Xóa vùng chọn (Delete / Backspace)"
          >
            <Trash2 className="size-4" />
          </button>
        </>
      )}
    </div>
  );
}
