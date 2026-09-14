"use client";

import React from "react";
import { ToolMode } from "./types";

interface CanvasFooterProps {
  currentTool: ToolMode;
  resultsCount: number;
  stageScale: number;
}

export function CanvasFooter({
  currentTool,
  resultsCount,
  stageScale,
}: CanvasFooterProps) {
  const getToolName = () => {
    switch (currentTool) {
      case "bbox":
        return "Vẽ Bounding Box (R)";
      case "polygon":
        return "Vẽ Đa Giác (P)";
      case "point":
        return "Chấm Điểm Mốc (K)";
      case "pan":
        return "Di Chuyển Canvas";
      default:
        return "Chọn & Chỉnh Sửa";
    }
  };

  return (
    <div className="flex items-center justify-between border-t border-slate-900 bg-slate-950 px-4 py-1.5 text-[11px] text-slate-400">
      <div className="flex items-center gap-3">
        <span>
          Chế độ:{" "}
          <strong className="font-mono uppercase text-slate-200">
            {getToolName()}
          </strong>
        </span>
        <span>•</span>
        <span>
          Vùng nhãn: <strong className="text-slate-200">{resultsCount}</strong>
        </span>
      </div>
      <div className="flex items-center gap-2 font-mono text-[10px]">
        <span>Zoom: {Math.round(stageScale * 100)}%</span>
        <span>•</span>
        <span>Cuộn chuột để Zoom • Giữ Pan để di chuyển</span>
      </div>
    </div>
  );
}
