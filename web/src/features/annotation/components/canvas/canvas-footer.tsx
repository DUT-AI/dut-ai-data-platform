"use client";

import React from "react";
import { ToolMode } from "./types";

interface CanvasFooterProps {
  currentTool: ToolMode;
  resultsCount: number;
  stageScale: number;
  naturalDimensions?: { width: number; height: number };
  cursorNormPos?: { x: number; y: number } | null;
}

export function CanvasFooter({
  currentTool,
  resultsCount,
  stageScale,
  naturalDimensions,
  cursorNormPos,
}: CanvasFooterProps) {
  const getToolName = () => {
    switch (currentTool) {
      case "bbox":
        return "Bounding Box (R)";
      case "polygon":
        return "Polygon (P)";
      case "point":
        return "Keypoint (K)";
      case "pan":
        return "Pan / Move (H)";
      default:
        return "Select & Edit (V)";
    }
  };

  const cursorPixelX =
    cursorNormPos && naturalDimensions && naturalDimensions.width > 0
      ? Math.round((cursorNormPos.x / 100) * naturalDimensions.width)
      : null;
  const cursorPixelY =
    cursorNormPos && naturalDimensions && naturalDimensions.height > 0
      ? Math.round((cursorNormPos.y / 100) * naturalDimensions.height)
      : null;

  return (
    <div className="flex items-center justify-between border-t border-slate-900 bg-slate-950 px-4 py-1.5 text-[11px] text-slate-400 select-none">
      <div className="flex items-center gap-3">
        <span>
          Tool:{" "}
          <strong className="font-mono uppercase text-blue-400">
            {getToolName()}
          </strong>
        </span>
        <span>•</span>
        <span>
          BBoxes: <strong className="text-slate-200">{resultsCount}</strong>
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
            X: {cursorPixelX}px ({cursorNormPos?.x.toFixed(1)}%) • Y:{" "}
            {cursorPixelY}px ({cursorNormPos?.y.toFixed(1)}%)
          </span>
        )}
        <span>•</span>
        <span className="text-slate-200 font-semibold">
          Zoom: {Math.round(stageScale * 100)}%
        </span>
      </div>
    </div>
  );
}
