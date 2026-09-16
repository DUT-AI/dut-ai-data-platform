"use client";

import React from "react";
import { Paintbrush, Eraser, Trash2, Sliders } from "lucide-react";

export interface BrushToolbarProps {
  currentTool: string;
  onSelectTool: (tool: string) => void;
  brushSize: number;
  onChangeBrushSize: (size: number) => void;
  maskOpacity: number;
  onChangeMaskOpacity: (opacity: number) => void;
  readOnly?: boolean;
  onClearCurrentMask?: () => void;
}

export function BrushToolbar({
  currentTool,
  onSelectTool,
  brushSize,
  onChangeBrushSize,
  maskOpacity,
  onChangeMaskOpacity,
  readOnly = false,
  onClearCurrentMask,
}: BrushToolbarProps) {
  return (
    <div className="flex items-center gap-1.5">
      {/* Brush Tool */}
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onSelectTool("brush")}
        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
          currentTool === "brush"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        } disabled:opacity-50`}
        title="Cọ vẽ - Brush (B)"
      >
        <Paintbrush className="size-4" />
      </button>

      {/* Eraser Tool */}
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onSelectTool("eraser")}
        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
          currentTool === "eraser"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        } disabled:opacity-50`}
        title="Cục tẩy - Eraser (E)"
      >
        <Eraser className="size-4" />
      </button>

      <div className="mx-1 h-4 w-px bg-slate-800" />

      {/* Brush Size Slider */}
      <div className="flex items-center gap-1 px-1.5 text-[11px] text-slate-300">
        <Sliders className="size-3 text-slate-500" />
        <span className="font-mono text-[10px] text-slate-400">Size:</span>
        <input
          type="range"
          min={3}
          max={80}
          value={brushSize}
          disabled={readOnly}
          onChange={(e) => onChangeBrushSize(parseInt(e.target.value, 10))}
          className="h-1.5 w-16 cursor-pointer appearance-none rounded bg-slate-700 accent-blue-500"
        />
        <span className="w-5 font-mono text-[10px] text-slate-400">{brushSize}px</span>
      </div>

      {/* Mask Opacity Slider */}
      <div className="flex items-center gap-1 px-1.5 text-[11px] text-slate-300">
        <span className="font-mono text-[10px] text-slate-400">Alpha:</span>
        <input
          type="range"
          min={0.1}
          max={0.9}
          step={0.05}
          value={maskOpacity}
          onChange={(e) => onChangeMaskOpacity(parseFloat(e.target.value))}
          className="h-1.5 w-14 cursor-pointer appearance-none rounded bg-slate-700 accent-blue-500"
        />
        <span className="w-6 font-mono text-[10px] text-slate-400">
          {Math.round(maskOpacity * 100)}%
        </span>
      </div>

      {/* Clear Mask Button */}
      {!readOnly && onClearCurrentMask && (
        <button
          type="button"
          onClick={onClearCurrentMask}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-950/80 hover:text-red-300"
          title="Xóa mặt nạ của nhãn hiện tại"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}
