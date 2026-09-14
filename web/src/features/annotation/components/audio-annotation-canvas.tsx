"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnnotationResult } from "../types";
import { Play, Pause, RotateCcw, Trash2, Headphones } from "lucide-react";

export interface AudioAnnotationCanvasProps {
  audioUrl?: string;
  results: AnnotationResult[];
  categoryColors?: Record<string, string>;
  categoryNames?: Record<string, string>;
  selectedCategoryId?: string | null;
  readOnly?: boolean;
  onChange?: (results: AnnotationResult[]) => void;
}

const DEFAULT_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
];

export function AudioAnnotationCanvas({
  audioUrl,
  results,
  categoryColors = {},
  categoryNames = {},
  selectedCategoryId,
  readOnly = false,
  onChange,
}: AudioAnnotationCanvasProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    null
  );

  // New segment drag state (in seconds)
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  const getColor = useCallback(
    (catId?: string | null, idx = 0) => {
      if (catId && categoryColors[catId]) return categoryColors[catId];
      return DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    },
    [categoryColors]
  );

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  // Draw simulated waveform bars
  useEffect(() => {
    const canvas = waveformRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw baseline
    ctx.strokeStyle = "rgba(71, 85, 105, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw bars
    const barCount = 120;
    const barWidth = width / barCount;
    for (let i = 0; i < barCount; i++) {
      // Deterministic bar height
      const seed = Math.sin(i * 0.4) * 0.5 + Math.cos(i * 0.8) * 0.3;
      const barH = Math.max(8, Math.abs(seed) * (height * 0.75));

      const isPassed = (i / barCount) * duration <= currentTime;
      ctx.fillStyle = isPassed ? "#3B82F6" : "rgba(100, 116, 139, 0.6)";

      ctx.fillRect(i * barWidth + 1, (height - barH) / 2, barWidth - 2, barH);
    }
  }, [duration, currentTime]);

  // Timeline mouse interaction: drag to create audio segment
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
        // Minimum segment 0.2 seconds
        const newId = `audio_${Date.now()}`;
        const newResult: AnnotationResult = {
          id: newId,
          result_type: "audio_segment",
          category_id: selectedCategoryId || null,
          geometry: {
            start: Number(start.toFixed(2)),
            end: Number(end.toFixed(2)),
          },
          created_at: new Date().toISOString(),
        };

        const updated = [...results, newResult];
        onChange?.(updated);
        setSelectedSegmentId(newId);
      } else {
        // Just seek playback
        if (audioRef.current) {
          audioRef.current.currentTime = start;
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
    if (selectedSegmentId === id) setSelectedSegmentId(null);
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}.${ms}`;
  };

  return (
    <div className="relative flex h-full min-h-[420px] w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      {/* Top action toolbar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <Headphones className="size-4 text-purple-400" />
          <span className="text-xs font-semibold text-slate-200">
            Âm thanh (Audio Waveform Annotation)
          </span>
          <span className="text-[11px] text-slate-400">
            • Kéo chuột trên dạng sóng để chọn phân đoạn âm thanh
          </span>
        </div>

        {selectedSegmentId && !readOnly && (
          <button
            type="button"
            onClick={() => handleDelete(selectedSegmentId)}
            className="flex items-center gap-1 rounded bg-red-950/80 px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-900"
          >
            <Trash2 className="size-3.5" />
            <span>Xóa phân đoạn</span>
          </button>
        )}
      </div>

      {/* Main Waveform Canvas & Segment Overlay */}
      <div className="flex flex-1 flex-col items-center justify-center space-y-6 p-6">
        {audioUrl ? (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />
        ) : null}

        {/* Waveform track */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative h-44 w-full cursor-crosshair overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-inner"
        >
          <canvas
            ref={waveformRef}
            width={800}
            height={176}
            className="pointer-events-none h-full w-full"
          />

          {/* Render Audio Segments */}
          {duration > 0 &&
            results
              .filter((r) => r.result_type === "audio_segment" && r.geometry)
              .map((res, idx) => {
                const start = Number(res.geometry?.start || 0);
                const end = Number(res.geometry?.end || 0);
                const left = (start / duration) * 100;
                const width = ((end - start) / duration) * 100;
                const color = getColor(res.category_id, idx);
                const isSelected = res.id === selectedSegmentId;
                const labelName = res.category_id
                  ? categoryNames[res.category_id] || "Tag"
                  : "Segment";

                return (
                  <div
                    key={res.id || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSegmentId(res.id || null);
                      if (audioRef.current) {
                        audioRef.current.currentTime = start;
                        setCurrentTime(start);
                      }
                    }}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: `${color}30`,
                      borderColor: color,
                    }}
                    className={`absolute inset-y-0 border-x-2 transition-all ${
                      isSelected
                        ? "z-20 ring-2 ring-blue-500"
                        : "z-10 hover:opacity-90"
                    }`}
                  >
                    <span
                      style={{ backgroundColor: color }}
                      className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white shadow"
                    >
                      {labelName} ({start}s - {end}s)
                    </span>
                  </div>
                );
              })}

          {/* Dragging In-progress Segment */}
          {duration > 0 && dragStart !== null && dragEnd !== null && (
            <div
              style={{
                left: `${(Math.min(dragStart, dragEnd) / duration) * 100}%`,
                width: `${(Math.abs(dragEnd - dragStart) / duration) * 100}%`,
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
            />
          )}
        </div>

        {/* Audio Controls Bar */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-colors hover:bg-blue-500"
          >
            {isPlaying ? (
              <Pause className="size-5" />
            ) : (
              <Play className="ml-0.5 size-5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-800 text-slate-400 transition-colors hover:bg-slate-900"
            title="Về đầu"
          >
            <RotateCcw className="size-4" />
          </button>
          <div className="font-mono text-xs text-slate-300">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-slate-900 bg-slate-950 px-4 py-2 text-[11px] text-slate-400">
        <div>
          Số phân đoạn đã gán:{" "}
          <strong className="text-slate-200">
            {results.filter((r) => r.result_type === "audio_segment").length}
          </strong>
        </div>
        <div className="font-mono text-[10px]">
          Thời lượng: {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
