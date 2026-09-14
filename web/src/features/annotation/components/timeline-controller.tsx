"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui";

export interface TimelineKeyframe {
  id: string;
  time: number; // in seconds
  label?: string;
  color?: string;
}

interface TimelineControllerProps {
  duration: number; // in seconds
  currentTime: number;
  keyframes?: TimelineKeyframe[];
  isPlaying?: boolean;
  onTimeChange: (time: number) => void;
  onPlayToggle?: () => void;
  onAddKeyframe?: (time: number) => void;
}

/**
 * Universal Timeline Controller for Audio & Video Temporal Annotations
 * Adapted from Label Studio components/Timeline/Timeline.tsx
 */
export function TimelineController({
  duration,
  currentTime,
  keyframes = [],
  isPlaying = false,
  onTimeChange,
  onPlayToggle,
  onAddKeyframe,
}: TimelineControllerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 1x to 5x zoom

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current || duration <= 0) return;
      const rect = trackRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      onTimeChange(percentage * duration);
    },
    [duration, onTimeChange]
  );

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col space-y-2 rounded-lg border border-slate-800 bg-slate-900/90 p-3 shadow-md">
      {/* Top Bar: Playback Controls & Time Format */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {onPlayToggle && (
            <Button
              size="sm"
              variant="outline"
              onClick={onPlayToggle}
              className="h-7 w-7 border-slate-700 bg-slate-950 p-0 text-xs text-slate-200"
              title={isPlaying ? "Tạm dừng (K)" : "Phát (K)"}
            >
              {isPlaying ? "⏸" : "▶"}
            </Button>
          )}

          {/* Stepping buttons */}
          <button
            type="button"
            onClick={() => onTimeChange(Math.max(0, currentTime - 0.1))}
            className="rounded p-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            title="Lùi 100ms (J)"
          >
            ⏮
          </button>
          <button
            type="button"
            onClick={() => onTimeChange(Math.min(duration, currentTime + 0.1))}
            className="rounded p-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            title="Tiến 100ms (L)"
          >
            ⏭
          </button>

          {/* Time display */}
          <div className="font-mono text-xs font-semibold text-slate-300">
            <span>{formatTime(currentTime)}</span>
            <span className="text-slate-500"> / {formatTime(duration)}</span>
          </div>
        </div>

        {/* Timeline Tools */}
        <div className="flex items-center space-x-2">
          {onAddKeyframe && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddKeyframe(currentTime)}
              className="h-6 border-slate-700 px-2 text-[11px] text-slate-300"
            >
              + Đánh dấu điểm mốc
            </Button>
          )}

          {/* Zoom controls */}
          <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-400">
            <span>Zoom:</span>
            <button
              type="button"
              disabled={zoomLevel <= 1}
              onClick={() => setZoomLevel((z) => Math.max(1, z - 1))}
              className="rounded px-1.5 py-0.5 hover:bg-slate-800 disabled:opacity-30"
            >
              －
            </button>
            <span>{zoomLevel}x</span>
            <button
              type="button"
              disabled={zoomLevel >= 5}
              onClick={() => setZoomLevel((z) => Math.min(5, z + 1))}
              className="rounded px-1.5 py-0.5 hover:bg-slate-800 disabled:opacity-30"
            >
              ＋
            </button>
          </div>
        </div>
      </div>

      {/* Main Track & Scrubber */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative h-9 w-full cursor-pointer select-none overflow-hidden rounded border border-slate-800 bg-slate-950/80 transition-all"
      >
        {/* Progress Background */}
        <div
          className="absolute bottom-0 left-0 top-0 border-r border-blue-500/50 bg-blue-950/40"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Keyframe Markers */}
        {keyframes.map((kf) => {
          const kfPercent = duration > 0 ? (kf.time / duration) * 100 : 0;
          return (
            <div
              key={kf.id}
              style={{
                left: `${kfPercent}%`,
                backgroundColor: kf.color || "#f59e0b",
              }}
              className="group absolute bottom-0 top-0 w-0.5 shadow-sm"
              title={`${kf.label || "Điểm mốc"}: ${formatTime(kf.time)}`}
            >
              <div className="absolute -left-1 top-0 h-2 w-2 rotate-45 bg-amber-400 opacity-80 group-hover:opacity-100" />
            </div>
          );
        })}

        {/* Current Time Playhead Scrubber */}
        <div
          style={{ left: `${progressPercent}%` }}
          className="absolute bottom-0 top-0 w-0.5 bg-red-500 shadow-md"
        >
          <div className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-red-500 shadow-sm" />
        </div>
      </div>
    </div>
  );
}
