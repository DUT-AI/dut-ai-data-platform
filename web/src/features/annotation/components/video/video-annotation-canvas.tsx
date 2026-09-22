"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnnotationResult } from "../../types";
import { Play, Pause, RotateCcw, Trash2, Video } from "lucide-react";

export interface VideoAnnotationCanvasProps {
  assetUrl?: string;
  results: AnnotationResult[];
  categoryColors?: Record<string, string>;
  categoryNames?: Record<string, string>;
  selectedCategoryId?: string | null;
  readOnly?: boolean;
  onChange?: (results: AnnotationResult[]) => void;
  // Note: Selected shape/segment logic is managed by workspace view
  selectedShapeId?: string | null;
  onSelectShapeId?: (id: string | null) => void;
}

const DEFAULT_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
];

export function VideoAnnotationCanvas({
  assetUrl,
  results,
  categoryColors = {},
  categoryNames = {},
  selectedCategoryId,
  readOnly = false,
  onChange,
  selectedShapeId,
  onSelectShapeId,
}: VideoAnnotationCanvasProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Segment dragging state
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  const getColor = useCallback(
    (catId?: string | null, idx = 0) => {
      if (catId && categoryColors[catId]) return categoryColors[catId];
      return DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    },
    [categoryColors]
  );

  // Playback handlers
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  // Setup Keyboard Shortcuts globally when this canvas is active
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "j":
        case "J":
        case "ArrowLeft":
          if (videoRef.current) {
            e.preventDefault();
            videoRef.current.currentTime = Math.max(
              0,
              videoRef.current.currentTime - 0.1
            );
          }
          break;
        case "l":
        case "L":
        case "ArrowRight":
          if (videoRef.current) {
            e.preventDefault();
            videoRef.current.currentTime = Math.min(
              duration,
              videoRef.current.currentTime + 0.1
            );
          }
          break;
        case "i":
        case "I": // Start Segment / Mark In
          if (!readOnly && videoRef.current) {
            e.preventDefault();
            setDragStart(videoRef.current.currentTime);
            if (dragEnd !== null && dragEnd <= videoRef.current.currentTime) {
              setDragEnd(null);
            }
          }
          break;
        case "o":
        case "O": // End Segment / Mark Out
          if (!readOnly && videoRef.current) {
            e.preventDefault();
            const time = videoRef.current.currentTime;

            // Auto commit if we had a start
            if (dragStart !== null) {
              const start = Math.min(dragStart, time);
              const end = Math.max(dragStart, time);

              if (end - start > 0.1) {
                const newId = `video_${Date.now()}`;
                const newResult: AnnotationResult = {
                  id: newId,
                  result_type: "video_segment",
                  category_id: selectedCategoryId || null,
                  geometry: {
                    start: Number(start.toFixed(2)),
                    end: Number(end.toFixed(2)),
                  },
                  created_at: new Date().toISOString(),
                };

                const updated = [...results, newResult];
                onChange?.(updated);
                onSelectShapeId?.(newId);
              }
              setDragStart(null);
              setDragEnd(null);
            } else {
              setDragEnd(time);
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlay,
    duration,
    readOnly,
    dragStart,
    dragEnd,
    selectedCategoryId,
    results,
    onChange,
    onSelectShapeId,
  ]);

  // Mouse Segmenting Handlers on Timeline
  const getTimeFromX = (clientX: number) => {
    if (!containerRef.current || duration === 0) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return (relX / rect.width) * duration;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    const time = getTimeFromX(e.clientX);
    setDragStart(time);
    setDragEnd(time);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStart !== null) {
      const time = getTimeFromX(e.clientX);
      setDragEnd((prev) =>
        prev !== null && Math.abs(prev - time) < 0.01 ? prev : time
      );
    }
  };

  const handleMouseUp = () => {
    if (dragStart !== null && dragEnd !== null && !readOnly) {
      const start = Math.min(dragStart, dragEnd);
      const end = Math.max(dragStart, dragEnd);

      if (end - start > 0.2) {
        const newId = `video_${Date.now()}`;
        const newResult: AnnotationResult = {
          id: newId,
          result_type: "video_segment",
          category_id: selectedCategoryId || null,
          geometry: {
            start: Number(start.toFixed(2)),
            end: Number(end.toFixed(2)),
          },
          created_at: new Date().toISOString(),
        };

        const updated = [...results, newResult];
        onChange?.(updated);
        onSelectShapeId?.(newId);
      } else {
        // Just seek playback
        if (videoRef.current) {
          videoRef.current.currentTime = start;
          setCurrentTime(start);
        }
      }
    }
    setDragStart(null);
    setDragEnd(null);
  };

  const handleDelete = (id: string) => {
    if (readOnly) return;
    const updated = results.filter((r) => r.id !== id);
    onChange?.(updated);
    if (selectedShapeId === id) onSelectShapeId?.(null);
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = (sec % 60).toFixed(1);
    return `${mins}:${Number(secs) < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      {/* Top action toolbar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <Video className="size-4 text-blue-400" />
          <span className="text-xs font-semibold text-slate-200">
            Video Canvas (Classification & Segmenting)
          </span>
          <span className="text-[11px] text-slate-400">
            • Phím tắt:{" "}
            <kbd className="rounded bg-slate-800 px-1 font-mono text-[10px] text-slate-200">
              I
            </kbd>{" "}
            chọn bắt đầu,{" "}
            <kbd className="rounded bg-slate-800 px-1 font-mono text-[10px] text-slate-200">
              O
            </kbd>{" "}
            chọn kết thúc & tạo đoạn nhãn,{" "}
            <kbd className="rounded bg-slate-800 px-1 font-mono text-[10px] text-slate-200">
              Space
            </kbd>{" "}
            phát/dừng
          </span>
        </div>

        {selectedShapeId && !readOnly && (
          <button
            type="button"
            onClick={() => handleDelete(selectedShapeId)}
            className="flex items-center gap-1 rounded bg-red-950/80 px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-900"
          >
            <Trash2 className="size-3.5" />
            <span>Xóa phân đoạn</span>
          </button>
        )}
      </div>

      {/* Main Video Player */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-black">
        {assetUrl ? (
          <video
            ref={videoRef}
            src={assetUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            className="max-h-full max-w-full object-contain outline-none"
            controls={false} // Disable native controls to use custom timeline
            crossOrigin="anonymous"
          />
        ) : (
          <div className="text-sm text-slate-500">Không có dữ liệu video</div>
        )}
      </div>

      {/* Video Controls & Timeline Bar */}
      <div className="flex flex-col border-t border-slate-800 bg-slate-900 px-4 py-3">
        {/* Timeline Track */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative mb-3 h-8 w-full cursor-crosshair overflow-hidden rounded border border-slate-800 bg-slate-950 shadow-inner"
        >
          {/* Base progress bar */}
          <div
            style={{
              width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
            }}
            className="absolute bottom-0 left-0 top-0 bg-blue-900/30"
          />

          {/* Render Video Segments */}
          {duration > 0 &&
            results
              .filter((r) => r.result_type === "video_segment" && r.geometry)
              .map((res, idx) => {
                const start = Number(res.geometry?.start || 0);
                const end = Number(res.geometry?.end || 0);
                const left = (start / duration) * 100;
                const width = ((end - start) / duration) * 100;
                const color = getColor(res.category_id, idx);
                const isSelected = res.id === selectedShapeId;
                const labelName = res.category_id
                  ? categoryNames[res.category_id] || "Tag"
                  : "Segment";

                return (
                  <div
                    key={res.id || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectShapeId?.(res.id || null);
                      if (videoRef.current) {
                        videoRef.current.currentTime = start;
                        setCurrentTime(start);
                      }
                    }}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: `${color}30`,
                      borderColor: color,
                    }}
                    className={`absolute inset-y-0 border-x-2 transition-[border-color,background-color,opacity] duration-150 ${
                      isSelected
                        ? "z-20 ring-2 ring-blue-500"
                        : "z-10 hover:bg-opacity-50 hover:opacity-90"
                    }`}
                    title={`${labelName} (${start}s - ${end}s)`}
                  />
                );
              })}

          {/* Dragging / Hotkey In-progress Segment */}
          {duration > 0 && dragStart !== null && (
            <div
              style={{
                left: `${(Math.min(dragStart, dragEnd || currentTime) / duration) * 100}%`,
                width: `${(Math.abs((dragEnd || currentTime) - dragStart) / duration) * 100}%`,
                backgroundColor: `${getColor(selectedCategoryId)}40`,
                borderColor: getColor(selectedCategoryId),
              }}
              className="pointer-events-none absolute inset-y-0 z-30 border-x-2 border-dashed"
            />
          )}

          {/* Current playback playhead line */}
          {duration > 0 && (
            <div
              style={{ left: `${(currentTime / duration) * 100}%` }}
              className="pointer-events-none absolute inset-y-0 z-40 w-0.5 bg-red-500 shadow"
            >
              <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500 shadow-sm" />
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-colors hover:bg-blue-500"
            >
              {isPlaying ? (
                <Pause className="size-4" />
              ) : (
                <Play className="ml-0.5 size-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  setCurrentTime(0);
                }
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              title="Về đầu"
            >
              <RotateCcw className="size-3" />
            </button>

            <div className="font-mono text-xs font-semibold text-slate-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-500">Tốc độ:</span>
            {[0.5, 1, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => handlePlaybackRateChange(rate)}
                className={`rounded px-1.5 py-0.5 ${playbackRate === rate ? "bg-blue-900/50 text-blue-300" : "text-slate-400 hover:bg-slate-800"}`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
