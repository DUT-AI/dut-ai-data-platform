"use client";

import React from "react";

export interface EditorFooterProps {
  currentTool: string;
  resultsCount: number;
  stageScale: number;
  naturalDimensions?: { width: number; height: number };
  cursorNormPos?: { x: number; y: number } | null;
}

export function EditorFooter({
  currentTool,
  resultsCount,
  stageScale,
  naturalDimensions,
  cursorNormPos,
}: EditorFooterProps) {
  const getToolDisplayName = () => {
    switch (currentTool) {
      case "bbox":
        return "Bounding Box (B)";
      case "polygon":
        return "Polygon (P)";
      case "brush":
        return "Brush (B)";
      case "eraser":
        return "Eraser (E)";
      case "pan":
        return "Pan (Space)";
      default:
        return "Select (V)";
    }
  };

  const isPercent = cursorNormPos ? cursorNormPos.x > 1.0 || cursorNormPos.y > 1.0 : false;
  const divisor = isPercent ? 100 : 1;

  const cursorPixelX =
    cursorNormPos && naturalDimensions && naturalDimensions.width > 0
      ? Math.round((cursorNormPos.x / divisor) * naturalDimensions.width)
      : null;
  const cursorPixelY =
    cursorNormPos && naturalDimensions && naturalDimensions.height > 0
      ? Math.round((cursorNormPos.y / divisor) * naturalDimensions.height)
      : null;

  const formattedNormX = cursorNormPos
    ? isPercent
      ? `${cursorNormPos.x.toFixed(1)}%`
      : cursorNormPos.x.toFixed(3)
    : "";
  const formattedNormY = cursorNormPos
    ? isPercent
      ? `${cursorNormPos.y.toFixed(1)}%`
      : cursorNormPos.y.toFixed(3)
    : "";

  return (
    <div className="flex select-none items-center justify-between border-t border-slate-900 bg-slate-950 px-4 py-1.5 text-[11px] text-slate-400">
      <div className="flex items-center gap-3">
        <span>
          Tool:{" "}
          <strong className="font-mono uppercase text-blue-400">
            {getToolDisplayName()}
          </strong>
        </span>
        <span>•</span>
        <span>
          Shapes: <strong className="text-slate-200">{resultsCount}</strong>
        </span>
        {naturalDimensions && naturalDimensions.width > 0 && (
          <>
            <span>•</span>
            <span className="font-mono text-slate-400">
              {naturalDimensions.width} × {naturalDimensions.height} px
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 font-mono text-[10px]">
        {cursorPixelX !== null && cursorPixelY !== null && (
          <span className="text-slate-300">
            X: {cursorPixelX}px ({formattedNormX}) • Y: {cursorPixelY}px (
            {formattedNormY})
          </span>
        )}
        <span>•</span>
        <span className="font-semibold text-slate-200">
          Zoom: {Math.round(stageScale * 100)}%
        </span>
      </div>
    </div>
  );
}
