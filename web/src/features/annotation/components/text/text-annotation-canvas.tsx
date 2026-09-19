"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnnotationResult } from "../../types";
import { Trash2, FileText } from "lucide-react";

export interface TextAnnotationCanvasProps {
  textUrl?: string;
  textContent?: string;
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

export function TextAnnotationCanvas({
  textUrl,
  textContent: initialText,
  results,
  categoryColors = {},
  categoryNames = {},
  selectedCategoryId,
  readOnly = false,
  onChange,
}: TextAnnotationCanvasProps) {
  const [text, setText] = useState<string>(initialText || "");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch text content if URL is provided and initialText is empty
  useEffect(() => {
    if (initialText) {
      return;
    }
    if (!textUrl) return;

    let isMounted = true;
    const abortController = new AbortController();

    fetch(textUrl, { signal: abortController.signal })
      .then((res) => {
        if (isMounted) setIsLoading(true);
        return res.text();
      })
      .then((data) => {
        if (isMounted) {
          setText(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isMounted || err.name === "AbortError") return;
        setText("Không thể tải nội dung tệp văn bản.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [initialText, textUrl]);

  const getColor = useCallback(
    (catId?: string | null, idx = 0) => {
      if (catId && categoryColors[catId]) return categoryColors[catId];
      return DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    },
    [categoryColors]
  );

  // Handle user selecting text in the document
  const handleMouseUp = () => {
    if (readOnly) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return;
    }

    const selectedStr = selection.toString();
    const range = selection.getRangeAt(0);

    // Calculate start and end offset relative to the text content
    if (
      !containerRef.current ||
      !containerRef.current.contains(range.commonAncestorContainer)
    ) {
      return;
    }

    // Measure character offsets
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(containerRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    const end = start + selectedStr.length;

    if (start >= end) return;

    const newId = `ner_${Date.now()}`;
    const newResult: AnnotationResult = {
      id: newId,
      result_type: "ner",
      category_id: selectedCategoryId || null,
      geometry: {
        start,
        end,
        text: selectedStr,
      },
      created_at: new Date().toISOString(),
    };

    const updated = [...results, newResult];
    onChange?.(updated);
    setSelectedSpanId(newId);

    // Clear selection
    selection.removeAllRanges();
  };

  const handleDelete = (id: string) => {
    if (readOnly) return;
    const updated = results.filter((r) => r.id !== id);
    onChange?.(updated);
    if (selectedSpanId === id) setSelectedSpanId(null);
  };

  // Build highlighted chunks from NER spans
  const renderAnnotatedText = () => {
    const nerSpans = results
      .filter(
        (r) =>
          r.result_type === "ner" &&
          r.geometry &&
          typeof r.geometry.start === "number"
      )
      .map((r) => ({
        id: r.id!,
        start: Number(r.geometry!.start),
        end: Number(r.geometry!.end),
        categoryId: r.category_id,
        spanText: String(r.geometry!.text || ""),
      }))
      .sort((a, b) => a.start - b.start);

    if (nerSpans.length === 0) {
      return <span className="whitespace-pre-wrap">{text}</span>;
    }

    const elements: React.ReactNode[] = [];
    let lastIdx = 0;

    nerSpans.forEach((span, i) => {
      // Non-highlighted gap
      if (span.start > lastIdx) {
        elements.push(
          <span key={`text-${lastIdx}`}>{text.slice(lastIdx, span.start)}</span>
        );
      }

      const color = getColor(span.categoryId, i);
      const isSelected = selectedSpanId === span.id;
      const labelName = span.categoryId
        ? categoryNames[span.categoryId] || "Label"
        : "Unlabeled";

      // Highlighted entity
      elements.push(
        <span
          key={span.id}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedSpanId(span.id);
          }}
          style={{
            backgroundColor: `${color}35`,
            borderBottom: `2px solid ${color}`,
          }}
          className={`group relative mx-0.5 inline-flex cursor-pointer items-baseline rounded px-1 py-0.5 transition-all ${isSelected
            ? "scale-[1.02] ring-2 ring-blue-500"
            : "hover:opacity-90"
            }`}
        >
          <span className="font-medium text-slate-100">
            {text.slice(span.start, span.end)}
          </span>
          <span
            style={{ backgroundColor: color }}
            className="py-0.2 ml-1.5 inline-flex items-center rounded px-1 text-[9px] font-bold uppercase tracking-wider text-white"
          >
            {labelName}
          </span>
          {!readOnly && isSelected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(span.id);
              }}
              className="ml-1 text-red-400 hover:text-red-300"
              title="Xóa nhãn thực thể này"
            >
              ×
            </button>
          )}
        </span>
      );

      lastIdx = Math.max(lastIdx, span.end);
    });

    if (lastIdx < text.length) {
      elements.push(<span key={`text-end`}>{text.slice(lastIdx)}</span>);
    }

    return (
      <div className="whitespace-pre-wrap leading-relaxed">{elements}</div>
    );
  };

  return (
    <div className="relative flex h-full min-h-[420px] w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      {/* Top action toolbar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-blue-400" />
          <span className="text-xs font-semibold text-slate-200">
            Văn bản (NLP / NER Annotation)
          </span>
          <span className="text-[11px] text-slate-400">
            • Bôi đen từ/câu để gán nhãn thực thể
          </span>
        </div>

        {selectedSpanId && !readOnly && (
          <button
            type="button"
            onClick={() => handleDelete(selectedSpanId)}
            className="flex items-center gap-1 rounded bg-red-950/80 px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-900"
          >
            <Trash2 className="size-3.5" />
            <span>Xóa vùng chọn</span>
          </button>
        )}
      </div>

      {/* Main Text Content Area */}
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="flex-1 select-text overflow-y-auto p-6 font-mono text-sm leading-7 text-slate-300"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            Đang tải dữ liệu văn bản...
          </div>
        ) : text ? (
          renderAnnotatedText()
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            Không có dữ liệu văn bản.
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-slate-900 bg-slate-950 px-4 py-2 text-[11px] text-slate-400">
        <div>
          Số thực thể đã gán:{" "}
          <strong className="text-slate-200">
            {results.filter((r) => r.result_type === "ner").length}
          </strong>
        </div>
        <div className="font-mono text-[10px]">
          Tổng độ dài văn bản: {text.length} ký tự
        </div>
      </div>
    </div>
  );
}
