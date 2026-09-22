"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { ClassificationEditor } from "../classification-editor";
import type { AnnotationResult } from "../../types";
import {
  getResultTimeRange,
  getResultTranscript,
  isAudioSegmentResult,
  isFullTranscriptResult,
  type AudioLabelMode,
} from "../../utils/audio-label-utils";

interface CategoryItem {
  id: string;
  name: string;
  color?: string | null;
  key: string;
}

export interface AudioAnnotationCanvasProps {
  audioUrl?: string;
  results: AnnotationResult[];
  mode?: AudioLabelMode;
  outputId?: string;
  outputMultiple?: boolean;
  categoryColors?: Record<string, string>;
  categoryNames?: Record<string, string>;
  selectedCategoryId?: string | null;
  availableCategories?: CategoryItem[];
  readOnly?: boolean;
  selectedShapeId?: string | null;
  validationErrors?: string[];
  onSelectShapeId?: (id: string | null) => void;
  onDurationChange?: (duration: number) => void;
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

let audioResultCounter = 0;

function createAudioResultId(prefix: string): string {
  audioResultCounter += 1;
  return `${prefix}_${Date.now()}_${audioResultCounter}`;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00.0";
  const safeSeconds = Math.max(0, seconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  const tenths = Math.floor((safeSeconds % 1) * 10);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}.${tenths}`;
}

export function AudioAnnotationCanvas({
  audioUrl,
  results,
  mode = "asr_segments",
  outputId,
  outputMultiple = false,
  categoryColors = {},
  categoryNames = {},
  selectedCategoryId,
  availableCategories = [],
  readOnly = false,
  selectedShapeId,
  validationErrors = [],
  onSelectShapeId,
  onDurationChange,
  onChange,
}: AudioAnnotationCanvasProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [localSelectedSegmentId, setLocalSelectedSegmentId] = useState<
    string | null
  >(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  const selectedSegmentId = selectedShapeId ?? localSelectedSegmentId;
  const setSelectedSegmentId = useCallback(
    (id: string | null) => {
      setLocalSelectedSegmentId(id);
      onSelectShapeId?.(id);
    },
    [onSelectShapeId]
  );

  const segments = useMemo(
    () => results.filter(isAudioSegmentResult),
    [results]
  );
  const selectedSegment = useMemo(
    () =>
      segments.find(
        (result) => (result.id || result.output_id) === selectedSegmentId
      ),
    [segments, selectedSegmentId]
  );
  const fullTranscriptResult = useMemo(
    () =>
      results.find(
        (result) =>
          isFullTranscriptResult(result) &&
          (!outputId || !result.output_id || result.output_id === outputId)
      ),
    [results, outputId]
  );

  const getColor = useCallback(
    (categoryId?: string | null, index = 0): string => {
      if (categoryId && categoryColors[categoryId]) {
        return categoryColors[categoryId];
      }
      return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    },
    [categoryColors]
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audioError) return;
    if (audio.paused) {
      void audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setAudioError("Không thể phát tệp âm thanh này.");
        });
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [audioError]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.code !== "Space" ||
        target?.matches(
          "input, textarea, select, button, [contenteditable='true']"
        )
      ) {
        return;
      }
      event.preventDefault();
      togglePlay();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay]);

  useEffect(() => {
    // Reset player state when the external audio resource changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAudioError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [audioUrl]);

  useEffect(() => {
    const canvas = waveformRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = "rgba(71, 85, 105, 0.5)";
    context.beginPath();
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.stroke();

    const barCount = 140;
    const barWidth = width / barCount;
    for (let index = 0; index < barCount; index += 1) {
      const seed =
        Math.sin(index * 0.41) * 0.52 + Math.cos(index * 0.79) * 0.28;
      const barHeight = Math.max(8, Math.abs(seed) * height * 0.76);
      const isPassed =
        duration > 0 && (index / barCount) * duration <= currentTime;
      context.fillStyle = isPassed ? "#3B82F6" : "rgba(100, 116, 139, 0.65)";
      context.fillRect(
        index * barWidth + 1,
        (height - barHeight) / 2,
        Math.max(1, barWidth - 2),
        barHeight
      );
    }
  }, [currentTime, duration]);

  const getTimeFromPointer = (clientX: number): number => {
    if (!timelineRef.current || duration <= 0) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return (relativeX / rect.width) * duration;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly || mode !== "asr_segments" || duration <= 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const time = getTimeFromPointer(event.clientX);
    setDragStart(time);
    setDragEnd(time);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart === null) return;
    setDragEnd(getTimeFromPointer(event.clientX));
  };

  const finishSegmentDrag = () => {
    if (dragStart === null || dragEnd === null || readOnly) return;
    const start = Math.min(dragStart, dragEnd);
    const end = Math.max(dragStart, dragEnd);

    if (end - start >= 0.2) {
      const id = createAudioResultId("audio_segment");
      const categoryId =
        selectedCategoryId || availableCategories[0]?.id || null;
      const newResult: AnnotationResult = {
        id,
        output_id: outputId,
        result_type: "audio_segment",
        category_id: categoryId,
        value: "",
        geometry: {
          start: Number(start.toFixed(2)),
          end: Number(end.toFixed(2)),
        },
        created_at: new Date().toISOString(),
      };
      onChange?.([...results, newResult]);
      setSelectedSegmentId(id);
    } else if (audioRef.current) {
      audioRef.current.currentTime = start;
      setCurrentTime(start);
    }

    setDragStart(null);
    setDragEnd(null);
  };

  const updateSegment = (
    segment: AnnotationResult,
    update: Partial<AnnotationResult>
  ) => {
    const id = segment.id || segment.output_id;
    onChange?.(
      results.map((result) =>
        (result.id || result.output_id) === id
          ? { ...result, output_id: outputId || result.output_id, ...update }
          : result
      )
    );
  };

  const deleteSegment = (segment: AnnotationResult) => {
    if (readOnly) return;
    const id = segment.id || segment.output_id;
    onChange?.(
      results.filter((result) => (result.id || result.output_id) !== id)
    );
    if (selectedSegmentId === id) setSelectedSegmentId(null);
  };

  const updateFullTranscript = (transcript: string) => {
    if (readOnly) return;
    if (fullTranscriptResult) {
      onChange?.(
        results.map((result) =>
          result === fullTranscriptResult
            ? {
                ...result,
                output_id: outputId || result.output_id,
                result_type: "text",
                value: transcript,
              }
            : result
        )
      );
      return;
    }

    onChange?.([
      ...results,
      {
        id: createAudioResultId("transcript"),
        output_id: outputId,
        result_type: "text",
        value: transcript,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const seekTo = (time: number) => {
    const safeTime = Math.max(0, Math.min(duration, time));
    if (audioRef.current) audioRef.current.currentTime = safeTime;
    setCurrentTime(safeTime);
  };

  const taskTitle =
    mode === "asr_segments"
      ? "ASR theo phân đoạn"
      : mode === "intent_classification"
        ? "Phân loại intent"
        : "Nhận dạng giọng nói";

  return (
    <div className="flex h-full min-h-[480px] w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Headphones className="size-4 text-purple-400" aria-hidden="true" />
          <span className="text-xs font-semibold text-slate-100">
            {taskTitle}
          </span>
          <span className="text-[11px] text-slate-400">
            {mode === "asr_segments"
              ? "Kéo trên timeline để tạo segment"
              : "Space để phát hoặc tạm dừng"}
          </span>
        </div>
        {mode === "asr_segments" && (
          <span className="text-[11px] text-slate-400">
            {segments.length} segment
          </span>
        )}
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration || 0;
          setDuration(nextDuration);
          onDurationChange?.(nextDuration);
          setAudioError(null);
        }}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          setAudioError(
            "Không thể tải audio. Hãy kiểm tra định dạng hoặc URL của tệp."
          );
        }}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
        <section className="flex min-h-[300px] flex-col justify-center gap-4 border-b border-slate-800 p-4 lg:border-b-0 lg:border-r">
          {!audioUrl || audioError ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-red-900/60 bg-red-950/20 p-6 text-center">
              <AlertTriangle
                className="size-6 text-red-400"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-red-300">
                {audioError || "Không có URL audio để hiển thị."}
              </p>
            </div>
          ) : (
            <>
              <div
                ref={timelineRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishSegmentDrag}
                onPointerCancel={() => {
                  setDragStart(null);
                  setDragEnd(null);
                }}
                className={`relative h-44 w-full touch-none overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-inner ${
                  mode === "asr_segments" && !readOnly
                    ? "cursor-crosshair"
                    : "cursor-pointer"
                }`}
                aria-label="Timeline audio"
              >
                <canvas
                  ref={waveformRef}
                  width={1000}
                  height={176}
                  className="pointer-events-none h-full w-full"
                />

                {duration > 0 &&
                  segments.map((segment, index) => {
                    const range = getResultTimeRange(segment);
                    if (!range) return null;
                    const id = segment.id || segment.output_id || String(index);
                    const color = getColor(segment.category_id, index);
                    const isSelected = id === selectedSegmentId;
                    return (
                      <button
                        key={id}
                        type="button"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => {
                          setSelectedSegmentId(id);
                          seekTo(range.start);
                        }}
                        style={{
                          left: `${(range.start / duration) * 100}%`,
                          width: `${((range.end - range.start) / duration) * 100}%`,
                          backgroundColor: `${color}30`,
                          borderColor: color,
                        }}
                        className={`absolute inset-y-0 border-x-2 text-left transition-[border-color,background-color,opacity] duration-150 ${
                          isSelected
                            ? "z-20 ring-2 ring-blue-400"
                            : "z-10 hover:bg-slate-700/30"
                        }`}
                        aria-label={`Chọn segment ${index + 1}`}
                      >
                        <span
                          style={{ backgroundColor: color }}
                          className="absolute left-1 top-2 max-w-[calc(100%-8px)] truncate rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow"
                        >
                          {categoryNames[segment.category_id || ""] ||
                            `Segment ${index + 1}`}
                        </span>
                      </button>
                    );
                  })}

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

                {duration > 0 && (
                  <div
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                    className="pointer-events-none absolute inset-y-0 z-40 w-0.5 bg-red-500 shadow"
                  />
                )}
              </div>

              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.01}
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => seekTo(Number(event.target.value))}
                className="w-full accent-blue-500"
                aria-label="Tua audio"
              />

              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={!audioUrl || Boolean(audioError)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={isPlaying ? "Tạm dừng" : "Phát audio"}
                >
                  {isPlaying ? (
                    <Pause className="size-5" aria-hidden="true" />
                  ) : (
                    <Play className="ml-0.5 size-5" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => seekTo(0)}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-800 text-slate-400 transition-colors hover:bg-slate-900 hover:text-white"
                  title="Về đầu"
                  aria-label="Tua về đầu"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                </button>
                <div className="min-w-28 font-mono text-xs text-slate-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="min-h-0 overflow-y-auto bg-slate-900/35 p-4">
          {mode === "asr_segments" && (
            <SegmentAnnotationPanel
              segments={segments}
              selectedSegment={selectedSegment}
              selectedSegmentId={selectedSegmentId}
              duration={duration}
              categories={availableCategories}
              categoryNames={categoryNames}
              categoryColors={categoryColors}
              readOnly={readOnly}
              onSelect={(segment) => {
                const id = segment.id || segment.output_id || null;
                setSelectedSegmentId(id);
                const range = getResultTimeRange(segment);
                if (range) seekTo(range.start);
              }}
              onUpdate={updateSegment}
              onDelete={deleteSegment}
            />
          )}

          {mode === "intent_classification" && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Intent của toàn bộ audio
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Chọn intent từ cấu hình nhãn của ontology.
                </p>
              </div>
              {availableCategories.length > 0 ? (
                <ClassificationEditor
                  results={results}
                  outputId={outputId}
                  availableCategories={availableCategories}
                  multiple={outputMultiple}
                  readOnly={readOnly}
                  onChange={onChange}
                />
              ) : (
                <EmptyPanel message="Ontology chưa cung cấp danh sách intent." />
              )}
            </div>
          )}

          {mode === "asr" && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Transcript toàn bộ audio
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Nghe lại audio và chỉnh sửa nội dung nhận dạng bên dưới.
                </p>
              </div>
              <label className="block text-xs font-medium text-slate-300">
                Transcript
                <textarea
                  value={getResultTranscript(fullTranscriptResult)}
                  onChange={(event) => updateFullTranscript(event.target.value)}
                  disabled={readOnly}
                  rows={12}
                  placeholder="Nhập nội dung transcript..."
                  className="mt-2 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm leading-6 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                />
              </label>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-800/70 bg-amber-950/30 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <AlertTriangle className="size-4" aria-hidden="true" />
                Cần kiểm tra trước khi lưu
              </div>
              <ul className="mt-2 space-y-1 pl-5 text-xs text-amber-200/90">
                {validationErrors.map((error) => (
                  <li key={error} className="list-disc">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

interface SegmentAnnotationPanelProps {
  segments: AnnotationResult[];
  selectedSegment?: AnnotationResult;
  selectedSegmentId: string | null;
  duration: number;
  categories: CategoryItem[];
  categoryNames: Record<string, string>;
  categoryColors: Record<string, string>;
  readOnly: boolean;
  onSelect: (segment: AnnotationResult) => void;
  onUpdate: (
    segment: AnnotationResult,
    update: Partial<AnnotationResult>
  ) => void;
  onDelete: (segment: AnnotationResult) => void;
}

function SegmentAnnotationPanel({
  segments,
  selectedSegment,
  selectedSegmentId,
  duration,
  categories,
  categoryNames,
  categoryColors,
  readOnly,
  onSelect,
  onUpdate,
  onDelete,
}: SegmentAnnotationPanelProps) {
  const selectedRange = selectedSegment
    ? getResultTimeRange(selectedSegment)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-100">
          Danh sách segment
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Chọn một segment để sửa thời gian, loại nhãn và transcript.
        </p>
      </div>

      {segments.length === 0 ? (
        <EmptyPanel message="Chưa có segment. Kéo trên timeline để tạo segment đầu tiên." />
      ) : (
        <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
          {segments.map((segment, index) => {
            const id = segment.id || segment.output_id || String(index);
            const range = getResultTimeRange(segment);
            const color =
              categoryColors[segment.category_id || ""] ||
              DEFAULT_COLORS[index % DEFAULT_COLORS.length];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(segment)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                  selectedSegmentId === id
                    ? "border-blue-500 bg-blue-950/40"
                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate text-xs font-medium text-slate-200">
                    {categoryNames[segment.category_id || ""] ||
                      `Segment ${index + 1}`}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[10px] text-slate-400">
                  {range
                    ? `${formatTime(range.start)}–${formatTime(range.end)}`
                    : "Thiếu thời gian"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selectedSegment && selectedRange && (
        <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-950/70 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              Chi tiết segment
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onDelete(selectedSegment)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-300 hover:bg-red-950/70"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Xóa
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-slate-400">
              Bắt đầu (giây)
              <input
                type="number"
                min={0}
                max={duration || undefined}
                step={0.01}
                value={selectedRange.start}
                disabled={readOnly}
                onChange={(event) =>
                  onUpdate(selectedSegment, {
                    geometry: {
                      ...(selectedSegment.geometry || {}),
                      start: Number(event.target.value),
                    },
                  })
                }
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-blue-500"
              />
            </label>
            <label className="text-[11px] text-slate-400">
              Kết thúc (giây)
              <input
                type="number"
                min={0}
                max={duration || undefined}
                step={0.01}
                value={selectedRange.end}
                disabled={readOnly}
                onChange={(event) =>
                  onUpdate(selectedSegment, {
                    geometry: {
                      ...(selectedSegment.geometry || {}),
                      end: Number(event.target.value),
                    },
                  })
                }
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-blue-500"
              />
            </label>
          </div>

          {categories.length > 0 && (
            <label className="block text-[11px] text-slate-400">
              Loại segment
              <select
                value={selectedSegment.category_id || ""}
                disabled={readOnly}
                onChange={(event) =>
                  onUpdate(selectedSegment, {
                    category_id: event.target.value || null,
                  })
                }
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
              >
                <option value="">Chọn loại segment</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-[11px] text-slate-400">
            Transcript
            <textarea
              value={getResultTranscript(selectedSegment)}
              disabled={readOnly}
              onChange={(event) =>
                onUpdate(selectedSegment, { value: event.target.value })
              }
              rows={4}
              placeholder="Nhập transcript cho segment..."
              className="mt-1 w-full resize-y rounded border border-slate-700 bg-slate-900 p-2 text-xs leading-5 text-slate-100 outline-none focus:border-blue-500"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 px-4 py-6 text-center text-xs text-slate-400">
      {message}
    </div>
  );
}
