"use client";

import React from "react";
import Link from "next/link";
import { Button, Badge } from "@/components/ui";
import type { Annotation } from "../../types";

interface WorkspaceHeaderProps {
  projectId: string;
  assetFilename: string;
  activeAnnotation?: Annotation;
  currentAssetIdx: number;
  totalAssets: number;
  hasPrev: boolean;
  hasNext: boolean;
  isSubmitting: boolean;
  isSidebarOpen: boolean;
  isFullscreen: boolean;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onSaveRevision: () => void;
  onToggleSidebar: () => void;
  onToggleFullscreen: () => void;
  onOpenInstructions: () => void;
  onOpenHotkeySettings: () => void;
}

/**
 * Top platform navigation, asset queue stepper, and main actions bar
 */
export function WorkspaceHeader({
  projectId,
  assetFilename,
  activeAnnotation,
  currentAssetIdx,
  totalAssets,
  hasPrev,
  hasNext,
  isSubmitting,
  isSidebarOpen,
  isFullscreen,
  onNavigatePrev,
  onNavigateNext,
  onSaveRevision,
  onToggleSidebar,
  onToggleFullscreen,
  onOpenInstructions,
  onOpenHotkeySettings,
}: WorkspaceHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 select-none items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
      {/* Left: Back Navigation & Asset Info */}
      <div className="flex items-center space-x-4">
        <Link
          href={`/projects/${projectId}`}
          className="flex items-center space-x-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
        >
          <span>←</span>
          <span>Quay lại Dataset</span>
        </Link>
        <div className="h-4 w-px bg-slate-800" />
        <span
          className="max-w-[200px] truncate font-mono text-sm font-semibold"
          title={assetFilename}
        >
          📄 {assetFilename}
        </span>
        {activeAnnotation && (
          <Badge
            variant="outline"
            className="border-slate-700 font-mono text-[10px] text-slate-400"
          >
            Target: {activeAnnotation.target_type}
          </Badge>
        )}
      </div>

      {/* Center: Session Queue Navigation */}
      {totalAssets > 0 && currentAssetIdx !== -1 && (
        <div className="flex items-center space-x-3">
          <Button
            size="sm"
            variant="outline"
            disabled={!hasPrev}
            onClick={onNavigatePrev}
            className="h-8 border-slate-800 bg-slate-950 px-3 text-xs text-slate-300 hover:bg-slate-900"
          >
            ◀ Trước ([)
          </Button>
          <span className="font-mono text-xs text-slate-400">
            Tệp {currentAssetIdx + 1} / {totalAssets}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={!hasNext}
            onClick={onNavigateNext}
            className="h-8 border-slate-800 bg-slate-950 px-3 text-xs text-slate-300 hover:bg-slate-900"
          >
            Sau (]) ▶
          </Button>
        </div>
      )}

      {/* Right: Action Buttons & Modals */}
      <div className="flex items-center space-x-2">
        {/* Instructions Modal Button */}
        <button
          type="button"
          onClick={onOpenInstructions}
          className="flex items-center space-x-1 rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          title="Hướng dẫn gán nhãn (H)"
        >
          <span>📖 Hướng dẫn</span>
        </button>

        {/* Hotkey Settings Button */}
        <button
          type="button"
          onClick={onOpenHotkeySettings}
          className="flex items-center space-x-1 rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          title="Tùy chỉnh Phím tắt"
        >
          <span>⌨️ Phím tắt</span>
        </button>

        {/* Fullscreen Toggle Button */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="flex items-center space-x-1 rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          title="Toàn màn hình (F)"
        >
          <span>{isFullscreen ? "🗗 Thu nhỏ" : "🗖 Toàn màn hình"}</span>
        </button>

        <Button
          size="sm"
          variant="default"
          disabled={isSubmitting}
          onClick={onSaveRevision}
          className="h-8 bg-blue-600 text-xs font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          {isSubmitting ? "Đang lưu..." : "💾 Lưu (Mod+S)"}
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={onToggleSidebar}
          className="h-8 font-mono text-xs"
        >
          {isSidebarOpen ? "➡️ Ẩn Sidebar" : "⬅️ Bảng điều khiển"}
        </Button>
      </div>
    </header>
  );
}
