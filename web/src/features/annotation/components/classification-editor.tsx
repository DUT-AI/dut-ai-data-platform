"use client";

import React, { useRef, useEffect } from "react";
import { AnnotationResult } from "../types";
import {
  CheckCircle2,
  Circle,
  Music,
  Film,
  FileText,
} from "lucide-react";

export interface ClassificationEditorProps {
  assetUrl?: string;
  results: AnnotationResult[];
  categoryColors?: Record<string, string>;
  categoryNames?: Record<string, string>;
  availableCategories?: Array<{
    id: string;
    name: string;
    color?: string | null;
    key: string;
  }>;
  multiple?: boolean;
  readOnly?: boolean;
  onChange?: (results: AnnotationResult[]) => void;
  metadata?: Record<string, unknown>;
}

let classificationIdCounter = 0;
function generateClassificationId(catId: string): string {
  classificationIdCounter += 1;
  return `class_${catId}__${Date.now()}_${classificationIdCounter}`;
}

export function ClassificationEditor({
  assetUrl,
  results,
  availableCategories = [],
  multiple = false,
  readOnly = false,
  onChange,
}: ClassificationEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Extract currently selected category IDs from classification results
  const selectedCategoryIds = results
    .filter((r) => r.result_type === "classification" && r.category_id)
    .map((r) => r.category_id as string);

  const handleToggleCategory = (catId: string) => {
    if (readOnly) return;

    if (multiple) {
      if (selectedCategoryIds.includes(catId)) {
        const updated = results.filter(
          (r) => !(r.result_type === "classification" && r.category_id === catId)
        );
        onChange?.(updated);
      } else {
        const newResult: AnnotationResult = {
          id: generateClassificationId(catId),
          result_type: "classification",
          category_id: catId,
          value: catId,
          created_at: new Date().toISOString(),
        };
        onChange?.([...results, newResult]);
      }
    } else {
      // Single choice
      const filtered = results.filter(
        (r) => r.result_type !== "classification"
      );
      if (selectedCategoryIds.includes(catId)) {
        onChange?.(filtered);
      } else {
        const newResult: AnnotationResult = {
          id: generateClassificationId(catId),
          result_type: "classification",
          category_id: catId,
          value: catId,
          created_at: new Date().toISOString(),
        };
        onChange?.([...filtered, newResult]);
      }
    }
  };

  // Keyboard Shortcuts: 1..9 for category picking & Space for Media Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      // Hotkeys 1..9 -> Toggle Category
      const numKey = parseInt(e.key, 10);
      if (!isNaN(numKey) && numKey >= 1 && numKey <= 9) {
        const catIdx = numKey - 1;
        if (catIdx < availableCategories.length) {
          e.preventDefault();
          handleToggleCategory(availableCategories[catIdx].id);
        }
      }

      // Space -> Toggle Play/Pause
      if (e.key === " ") {
        if (videoRef.current) {
          e.preventDefault();
          if (videoRef.current.paused) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
        } else if (audioRef.current) {
          e.preventDefault();
          if (audioRef.current.paused) {
            audioRef.current.play();
          } else {
            audioRef.current.pause();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [availableCategories, selectedCategoryIds, results, readOnly, multiple]);

  // Detect Media Type from assetUrl
  const urlLower = (assetUrl || "").toLowerCase();
  const isVideo =
    urlLower.includes(".mp4") ||
    urlLower.includes(".webm") ||
    urlLower.includes(".mov") ||
    urlLower.includes(".avi") ||
    urlLower.includes(".mkv") ||
    urlLower.includes("/video/");
  const isAudio =
    urlLower.includes(".mp3") ||
    urlLower.includes(".wav") ||
    urlLower.includes(".ogg") ||
    urlLower.includes(".m4a") ||
    urlLower.includes(".flac") ||
    urlLower.includes("/audio/");
  const isImage =
    urlLower.includes(".png") ||
    urlLower.includes(".jpg") ||
    urlLower.includes(".jpeg") ||
    urlLower.includes(".webp") ||
    urlLower.includes(".gif") ||
    urlLower.includes(".svg") ||
    (!isVideo && !isAudio && assetUrl);

  return (
    <div className="flex h-full w-full flex-col space-y-4 overflow-y-auto">
      {/* Media Player / Preview Container */}
      <div className="flex min-h-[300px] w-full flex-1 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-inner">
        {assetUrl ? (
          isVideo ? (
            <video
              ref={videoRef}
              src={assetUrl}
              controls
              preload="metadata"
              className="max-h-[380px] w-full rounded-lg bg-black object-contain shadow-lg"
            />
          ) : isAudio ? (
            <div className="flex w-full flex-col items-center justify-center space-y-4 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                <Music className="h-8 w-8 animate-pulse" />
              </div>
              <audio
                ref={audioRef}
                src={assetUrl}
                controls
                className="w-full max-w-lg"
              />
            </div>
          ) : isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={assetUrl}
              alt="Asset preview"
              className="max-h-[380px] max-w-full rounded-lg object-contain shadow-md"
            />
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
              <FileText className="h-8 w-8" />
              <span className="text-xs">Tập tin dữ liệu</span>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2 text-slate-500">
            <Film className="h-8 w-8" />
            <span className="text-xs">Đang tải tập tin truyền thông...</span>
          </div>
        )}
      </div>

      {/* Category Selection Bar / Options Grid */}
      <div className="flex flex-col space-y-2.5 rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs">
          <span className="font-semibold text-slate-200">
            Phân Loại (Classification){" "}
            {multiple ? "- Nhiều lựa chọn" : "- Lựa chọn duy nhất"}
          </span>
          <span className="text-[11px] text-slate-400">
            {selectedCategoryIds.length} đã chọn • Phím phím số <kbd className="rounded bg-slate-800 px-1 font-mono text-[10px] text-slate-200">1</kbd>..<kbd className="rounded bg-slate-800 px-1 font-mono text-[10px] text-slate-200">9</kbd> chọn nhãn nhanh, <kbd className="rounded bg-slate-800 px-1 font-mono text-[10px] text-slate-200">[</kbd> <kbd className="rounded bg-slate-800 px-1 font-mono text-[10px] text-slate-200">]</kbd> sang tệp
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 lg:grid-cols-3">
          {availableCategories.map((cat, idx) => {
            const isSelected = selectedCategoryIds.includes(cat.id);
            const color = cat.color || "#3b82f6";
            const shortcutNum = idx < 9 ? idx + 1 : null;

            return (
              <button
                key={cat.id}
                type="button"
                disabled={readOnly}
                onClick={() => handleToggleCategory(cat.id)}
                style={{
                  borderColor: isSelected ? color : "rgba(51, 65, 85, 0.6)",
                  backgroundColor: isSelected
                    ? `${color}25`
                    : "rgba(15, 23, 42, 0.4)",
                }}
                className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? "shadow-sm ring-1 ring-blue-500/40"
                    : "hover:border-slate-700 hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-medium text-slate-100">
                    {cat.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {shortcutNum && (
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                      {shortcutNum}
                    </span>
                  )}
                  {isSelected ? (
                    <CheckCircle2 className="size-4 shrink-0 text-blue-400" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-slate-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
