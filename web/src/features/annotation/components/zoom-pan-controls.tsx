"use client";

import React from "react";

interface ZoomPanControlsProps {
  scale: number;
  isPanActive: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomFit: () => void;
  onTogglePan: () => void;
}

/**
 * Floating Zoom & Pan toolbar for spatial canvases
 * Adapted from Label Studio tools/Zoom.jsx
 */
export function ZoomPanControls({
  scale,
  isPanActive,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomFit,
  onTogglePan,
}: ZoomPanControlsProps) {
  const percentage = Math.round(scale * 100);

  return (
    <div className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-900/90 p-1 shadow-lg backdrop-blur-sm">
      {/* Pan / Hand Mode Toggle */}
      <button
        type="button"
        onClick={onTogglePan}
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
          isPanActive
            ? "bg-blue-600 text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        }`}
        title="Công cụ Di chuyển (Pan: Space)"
      >
        ✋ Pan
      </button>

      <div className="h-4 w-px bg-slate-800" />

      {/* Zoom Out */}
      <button
        type="button"
        onClick={onZoomOut}
        className="rounded px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        title="Thu nhỏ (-)"
      >
        －
      </button>

      {/* Current Scale Display */}
      <span className="w-12 text-center font-mono text-[11px] font-semibold text-slate-400">
        {percentage}%
      </span>

      {/* Zoom In */}
      <button
        type="button"
        onClick={onZoomIn}
        className="rounded px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        title="Phóng to (+)"
      >
        ＋
      </button>

      <div className="h-4 w-px bg-slate-800" />

      {/* Zoom to Fit */}
      <button
        type="button"
        onClick={onZoomFit}
        className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        title="Vừa màn hình (Shift+1)"
      >
        Fit
      </button>

      {/* Zoom to Original (100%) */}
      <button
        type="button"
        onClick={onZoomReset}
        className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        title="Kích thước gốc (Shift+0)"
      >
        1:1
      </button>
    </div>
  );
}
