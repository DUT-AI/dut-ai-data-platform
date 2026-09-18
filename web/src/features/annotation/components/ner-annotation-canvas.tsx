"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Tag, Trash2 } from "lucide-react";
import { AnnotationResult } from "../types";
import { BaseEditorComponentProps } from "../registry/editor-registry";

// ---------------------------------------------------------------------------
// Offset helper — counts only source-text characters, skipping annotation-UI
// nodes (label badges, delete buttons) that share the same selectable container.
// ---------------------------------------------------------------------------

function getSourceOffset(
  container: HTMLElement,
  targetNode: Node,
  targetOffset: number
): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      // Walk up from the text node; reject if inside a UI element
      let el: Node | null = node.parentElement;
      while (el && el !== container) {
        if (
          el instanceof HTMLElement &&
          el.dataset.annotationUi === "true"
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        el = el.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let offset = 0;
  let current = walker.nextNode();
  while (current) {
    if (current === targetNode) return offset + targetOffset;
    offset += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }
  return offset;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NerSpan {
  id: string;
  start: number;
  end: number;
  categoryId: string | null;
  spanText: string;
}

interface PopoverState {
  x: number;
  y: number;
  start: number;
  end: number;
  text: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface NerAnnotationCanvasProps extends BaseEditorComponentProps {
  /** Inline text content — used as fallback when assetUrl is not provided */
  textContent?: string;
}

export function NerAnnotationCanvas({
  assetUrl,
  textContent: textContentProp,
  results,
  categoryColors = {},
  categoryNames = {},
  selectedCategoryId,
  availableCategories = [],
  readOnly = false,
  onChange,
  metadata,
}: NerAnnotationCanvasProps) {
  const [text, setText] = useState<string>(textContentProp ?? "");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Resolve text: inline prop OR fetch from URL (assetUrl), fallback metadata.textContent
  useEffect(() => {
    if (textContentProp) {
      setText(textContentProp);
      return;
    }
    const metaText = (metadata as Record<string, unknown> | undefined)
      ?.textContent as string | undefined;
    if (metaText) {
      setText(metaText);
      return;
    }
    if (!assetUrl) return;

    let isMounted = true;
    const controller = new AbortController();
    setIsLoading(true);

    fetch(assetUrl, { signal: controller.signal })
      .then((res) => res.text())
      .then((data) => {
        if (isMounted) {
          setText(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isMounted || err.name === "AbortError") return;
        setText("Không thể tải nội dung văn bản.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [assetUrl, textContentProp, metadata]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getColor = useCallback(
    (catId?: string | null, idx = 0): string => {
      if (catId && categoryColors[catId]) return categoryColors[catId];
      return DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    },
    [categoryColors]
  );

  const nerSpans: NerSpan[] = useMemo(
    () =>
      results
        .filter(
          (r) =>
            r.result_type === "ner" &&
            // Exclude QA answers — they share result_type "ner" but carry payload.question
            (r.payload as Record<string, unknown> | null | undefined)?.question === undefined &&
            r.geometry &&
            typeof r.geometry.start === "number"
        )
        .map((r, idx) => ({
          // Use id ?? output_id for consistent identity across human and machine spans
          id: r.id ?? r.output_id ?? `span_${idx}`,
          start: Number(r.geometry!.start),
          end: Number(r.geometry!.end),
          categoryId: r.category_id ?? null,
          spanText: String(r.geometry!.text ?? ""),
        }))
        .sort((a, b) => a.start - b.start),
    [results]
  );

  const hasOverlap = useCallback(
    (start: number, end: number): boolean =>
      nerSpans.some(
        (s) => !(end <= s.start || start >= s.end)
      ),
    [nerSpans]
  );

  // ── Interaction: text selection ───────────────────────────────────────────

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        return;
      }

      const selectedStr = selection.toString();
      const range = selection.getRangeAt(0);

      if (
        !containerRef.current ||
        !containerRef.current.contains(range.commonAncestorContainer)
      ) {
        return;
      }

      // Compute char offsets — walk text nodes only, skipping annotation-UI nodes.
      // Use endContainer for `end` so the ✓/label badge text excluded by the walker
      // doesn't inflate the selection length.
      const start = getSourceOffset(
        containerRef.current,
        range.startContainer,
        range.startOffset
      );
      const end = getSourceOffset(
        containerRef.current,
        range.endContainer,
        range.endOffset
      );
      // Derive span text from source string rather than the rendered DOM selection
      const spanText = text.slice(start, end);

      if (start >= end) return;
      if (hasOverlap(start, end)) {
        selection.removeAllRanges();
        return;
      }

      // If a category is already active in sidebar → assign immediately
      if (selectedCategoryId) {
        createSpan(start, end, spanText, selectedCategoryId);
        selection.removeAllRanges();
        return;
      }

      // Otherwise show the inline popover
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      setPopover({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 8,
        start,
        end,
        text: spanText,
      });
      selection.removeAllRanges();
    },
    [readOnly, selectedCategoryId, hasOverlap] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const createSpan = useCallback(
    (start: number, end: number, spanText: string, catId: string | null) => {
      const spanId = `ner_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      // Stamp output_id from editorMetadata so multi-output ontologies can
      // associate this result with the correct named_entity output definition.
      const outputId = (metadata as Record<string, unknown> | undefined)
        ?.outputId as string | undefined;
      const newResult: AnnotationResult = {
        id: spanId,
        output_id: outputId,
        result_type: "ner",
        category_id: catId,
        geometry: { start, end, text: spanText },
        created_at: new Date().toISOString(),
      };
      onChange?.([...results, newResult]);
      setSelectedSpanId(spanId);
      setPopover(null);
    },
    [results, onChange, metadata]
  );

  const handlePopoverSelect = useCallback(
    (catId: string) => {
      if (!popover) return;
      createSpan(popover.start, popover.end, popover.text, catId);
    },
    [popover, createSpan]
  );

  const handleDeleteSpan = useCallback(
    (id: string) => {
      if (readOnly) return;
      // Match by id ?? output_id for consistency with nerSpans mapping
      onChange?.(results.filter((r) => (r.id ?? r.output_id) !== id));
      if (selectedSpanId === id) setSelectedSpanId(null);
    },
    [readOnly, results, onChange, selectedSpanId]
  );

  // ── Hotkeys ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Del → delete selected span
      if (e.key === "Delete" && selectedSpanId && !readOnly) {
        handleDeleteSpan(selectedSpanId);
        return;
      }
      // Esc → close popover
      if (e.key === "Escape") {
        setPopover(null);
        return;
      }
      // 1-9 → select category by index (only when popover is open or span selected)
      const digit = parseInt(e.key, 10);
      if (!isNaN(digit) && digit >= 1 && digit <= 9 && availableCategories.length > 0) {
        const cat = availableCategories[digit - 1];
        if (!cat) return;
        if (popover) {
          handlePopoverSelect(cat.id);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedSpanId,
    readOnly,
    handleDeleteSpan,
    popover,
    availableCategories,
    handlePopoverSelect,
  ]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setPopover(null);
      }
    };
    if (popover) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popover]);

  // ── Render: annotated text ────────────────────────────────────────────────

  const renderAnnotatedText = useCallback(() => {
    if (nerSpans.length === 0) {
      return <span className="whitespace-pre-wrap">{text}</span>;
    }

    const elements: React.ReactNode[] = [];
    let lastIdx = 0;

    nerSpans.forEach((span, i) => {
      if (span.start > lastIdx) {
        elements.push(
          <span key={`gap-${lastIdx}`}>{text.slice(lastIdx, span.start)}</span>
        );
      }

      const color = getColor(span.categoryId, i);
      const isSelected = selectedSpanId === span.id;
      const labelName = span.categoryId
        ? (categoryNames[span.categoryId] ?? "Label")
        : "Unlabeled";

      elements.push(
        <span
          key={span.id}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedSpanId(isSelected ? null : span.id);
          }}
          style={{
            backgroundColor: `${color}30`,
            borderBottom: `2px solid ${color}`,
          }}
          className={`group relative mx-0.5 inline-flex cursor-pointer items-baseline rounded px-1 py-0.5 transition-all ${
            isSelected
              ? "scale-[1.02] ring-2 ring-blue-500"
              : "hover:opacity-85"
          }`}
        >
          <span className="font-medium text-slate-100">
            {text.slice(span.start, span.end)}
          </span>
          <span
            style={{ backgroundColor: color }}
            className="ml-1.5 inline-flex items-center rounded px-1 py-px text-[9px] font-bold uppercase tracking-wider text-white"
            data-annotation-ui="true"
          >
            {labelName}
          </span>
          {!readOnly && isSelected && (
            <button
              type="button"
              data-annotation-ui="true"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSpan(span.id);
              }}
              className="ml-1 text-red-400 hover:text-red-300"
              title="Xóa thực thể này"
            >
              ×
            </button>
          )}
        </span>
      );

      lastIdx = Math.max(lastIdx, span.end);
    });

    if (lastIdx < text.length) {
      elements.push(
        <span key="text-tail">{text.slice(lastIdx)}</span>
      );
    }

    return (
      <div className="whitespace-pre-wrap leading-relaxed">{elements}</div>
    );
  }, [
    text,
    nerSpans,
    selectedSpanId,
    readOnly,
    getColor,
    categoryNames,
    handleDeleteSpan,
  ]);

  // ── Span count by category ────────────────────────────────────────────────

  const spanCountByCat = useMemo(() => {
    const counts: Record<string, number> = {};
    nerSpans.forEach((s) => {
      const key = s.categoryId ?? "__unlabeled__";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [nerSpans]);

  // ── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex h-full min-h-[420px] w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-violet-400" />
          <span className="text-xs font-semibold text-slate-200">
            Named Entity Recognition
          </span>
          <span className="text-[11px] text-slate-400">
            • Bôi đen để gán nhãn thực thể
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Per-category badges */}
          {availableCategories
            .filter((c) => spanCountByCat[c.id])
            .map((c) => (
              <span
                key={c.id}
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: c.color ?? "#6366F1" }}
              >
                {c.name}: {spanCountByCat[c.id]}
              </span>
            ))}

          {selectedSpanId && !readOnly && (
            <button
              type="button"
              onClick={() => handleDeleteSpan(selectedSpanId)}
              className="flex items-center gap-1 rounded bg-red-950/80 px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-900"
            >
              <Trash2 className="size-3.5" />
              <span>Xóa vùng chọn</span>
            </button>
          )}
        </div>
      </div>

      {/* Main text area — position:relative for popover positioning */}
      <div className="relative flex-1 overflow-y-auto">
        <div
          ref={containerRef}
          onMouseUp={handleMouseUp}
          className="select-text p-6 font-mono text-sm leading-7 text-slate-300"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              Đang tải dữ liệu văn bản...
            </div>
          ) : text ? (
            renderAnnotatedText()
          ) : (
            <div className="flex h-48 items-center justify-center text-xs text-slate-500">
              Không có dữ liệu văn bản.
            </div>
          )}
        </div>

        {/* Inline label popover */}
        {popover && !readOnly && availableCategories.length > 0 && (
          <div
            ref={popoverRef}
            style={{
              position: "absolute",
              left: `${popover.x}px`,
              top: `${popover.y}px`,
              transform: "translate(-50%, -100%)",
            }}
            className="z-50 animate-in fade-in zoom-in-95 rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-2xl"
          >
            <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Chọn nhãn
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availableCategories.map((cat, idx) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handlePopoverSelect(cat.id)}
                  style={{ backgroundColor: cat.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length] }}
                  className="rounded px-2 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-80"
                  title={`Phím tắt: ${idx + 1}`}
                >
                  {cat.name}
                  <span className="ml-1 rounded bg-black/20 px-0.5 text-[9px]">
                    {idx + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-900 bg-slate-950 px-4 py-2 text-[11px] text-slate-400">
        <div>
          Thực thể đã gán:{" "}
          <strong className="text-slate-200">{nerSpans.length}</strong>
        </div>
        <div className="font-mono text-[10px]">
          {text.length.toLocaleString()} ký tự
          {!readOnly && (
            <span className="ml-3 text-slate-600">
              Del: xóa · 1-9: chọn nhãn · Esc: đóng
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
