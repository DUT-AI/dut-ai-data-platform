"use client";

import React from "react";
import { Button, Badge } from "@/components/ui";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Expand,
  FileText,
  Keyboard,
  Minimize,
  PanelRightClose,
  PanelRightOpen,
  Save,
  ScrollText,
} from "lucide-react";
import type { Annotation } from "../../types";

interface WorkspaceHeaderProps {
  projectId?: string;
  assetFilename: string;
  activeAnnotation?: Annotation;
  currentAssetIdx: number;
  totalAssets: number;
  hasPrev: boolean;
  hasNext: boolean;
  isSubmitting: boolean;
  isSidebarOpen: boolean;
  isFullscreen: boolean;
  hasUnsavedChanges?: boolean;
  onNavigateBack?: () => void;
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
  hasUnsavedChanges = false,
  onNavigateBack,
  onNavigatePrev,
  onNavigateNext,
  onSaveRevision,
  onToggleSidebar,
  onToggleFullscreen,
  onOpenInstructions,
  onOpenHotkeySettings,
}: WorkspaceHeaderProps) {
  const handleBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else if (projectId) {
      window.location.href = `/projects/${projectId}`;
    } else {
      window.history.back();
    }
  };

  return (
    <header className="flex min-h-14 shrink-0 select-none flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2 sm:px-4 lg:h-14 lg:flex-nowrap lg:px-6 lg:py-0">
      {/* Left: Back Navigation & Asset Info */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center space-x-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Quay lại Dataset</span>
        </button>
        <div className="h-4 w-px bg-slate-800" />
        <span
          className="max-w-[200px] truncate font-mono text-sm font-semibold"
          title={assetFilename}
        >
          <FileText className="mr-1 inline h-4 w-4" />
          {assetFilename}
        </span>
        {activeAnnotation && (
          <Badge
            variant="outline"
            className="border-slate-700 font-mono text-[10px] text-slate-400"
          >
            Target: {activeAnnotation.target_type}
          </Badge>
        )}
        {hasUnsavedChanges && (
          <Badge
            variant="outline"
            className="border-amber-700/70 bg-amber-950/40 text-[10px] text-amber-300"
          >
            Chưa lưu
          </Badge>
        )}
      </div>

      {/* Center: Session Queue Navigation */}
      {totalAssets > 0 && currentAssetIdx !== -1 && (
        <div className="order-3 flex w-full items-center justify-center gap-2 lg:order-none lg:w-auto lg:space-x-3">
          <Button
            size="sm"
            variant="outline"
            disabled={!hasPrev}
            onClick={onNavigatePrev}
            className="h-8 border-slate-800 bg-slate-950 px-3 text-xs text-slate-300 hover:bg-slate-900"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Trước ([)</span>
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
            <span className="hidden sm:inline">Sau (])</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Right: Action Buttons & Modals */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Instructions Modal Button */}
        <button
          type="button"
          onClick={onOpenInstructions}
          className="flex items-center space-x-1 rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          title="Hướng dẫn gán nhãn (H)"
        >
          <ScrollText className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Hướng dẫn</span>
        </button>

        {/* Hotkey Settings Button */}
        <button
          type="button"
          onClick={onOpenHotkeySettings}
          className="flex items-center space-x-1 rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          title="Tùy chỉnh Phím tắt"
        >
          <Keyboard className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Phím tắt</span>
        </button>

        {/* Fullscreen Toggle Button */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="flex items-center space-x-1 rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          title="Toàn màn hình (F)"
        >
          {isFullscreen ? (
            <Minimize className="h-3.5 w-3.5" />
          ) : (
            <Expand className="h-3.5 w-3.5" />
          )}
          <span className="hidden xl:inline">
            {isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
          </span>
        </button>

        <Button
          size="sm"
          variant="default"
          disabled={isSubmitting}
          onClick={onSaveRevision}
          className="h-8 bg-blue-600 text-xs font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          <Save className="mr-1 h-3.5 w-3.5" />
          {isSubmitting ? "Đang lưu..." : "Lưu"}
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={onToggleSidebar}
          className="h-8 font-mono text-xs"
        >
          {isSidebarOpen ? (
            <PanelRightClose className="h-3.5 w-3.5" />
          ) : (
            <PanelRightOpen className="h-3.5 w-3.5" />
          )}
          <span className="hidden xl:inline">
            {isSidebarOpen ? "Ẩn panel" : "Mở panel"}
          </span>
        </Button>
      </div>
    </header>
  );
}
