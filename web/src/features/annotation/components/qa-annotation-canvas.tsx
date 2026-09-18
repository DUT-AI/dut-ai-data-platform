"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { HelpCircle, CheckCheck, Trash2, XCircle } from "lucide-react";
import { AnnotationResult } from "../types";
import { BaseEditorComponentProps } from "../registry/editor-registry";

// ---------------------------------------------------------------------------
// Offset helper — counts only source-text characters, skipping annotation-UI
// nodes (✓ markers from confirmed spans) that share the same selectable container.
// ---------------------------------------------------------------------------

function getSourceOffset(
  container: HTMLElement,
  targetNode: Node,
  targetOffset: number
): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
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

interface QaSpan {
  id: string;
  /** null for free-text-only answers that have no span in the context */
  start: number | null;
  end: number | null;
  answerText: string;
  question: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface QaAnnotationCanvasProps extends BaseEditorComponentProps {
  /** Inline context text — fallback when assetUrl is absent */
  textContent?: string;
  /**
   * metadata.question      — the question to answer (string)
   * metadata.allowFreeText — whether free-text editing of answer is allowed (boolean, default true)
   * metadata.textContent   — inline text fallback
   */
}

export function QaAnnotationCanvas({
  assetUrl,
  textContent: textContentProp,
  results,
  readOnly = false,
  onChange,
  metadata,
}: QaAnnotationCanvasProps) {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  const question = (meta.question as string | undefined) ?? "";
  const allowFreeText = meta.allowFreeText !== false; // default true

  const [contextText, setContextText] = useState<string>(textContentProp ?? "");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Pending span (highlighted but not yet confirmed)
  const [pendingSpan, setPendingSpan] = useState<{
    start: number;
    end: number;
    text: string;
  } | null>(null);
  const [freeText, setFreeText] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Load context text ─────────────────────────────────────────────────────

  useEffect(() => {
    if (textContentProp) {
      setContextText(textContentProp);
      return;
    }
    const metaText = meta.textContent as string | undefined;
    if (metaText) {
      setContextText(metaText);
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
          setContextText(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isMounted || err.name === "AbortError") return;
        setContextText("Không thể tải nội dung văn bản.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [assetUrl, textContentProp, meta.textContent]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived: existing QA answer spans ────────────────────────────────────

  const qaSpans: QaSpan[] = useMemo(() => {
    // Scope results to the active output ID to prevent cross-output mutation
    // in multi-output ontologies (Copilot High: outputId scoping).
    const activeOutputId = (meta.outputId as string | undefined);

    return results
      .filter(
        (r) =>
          r.result_type === "ner" &&
          (r.payload as Record<string, unknown> | null | undefined)?.question !== undefined &&
          // Scope: allow results with matching output_id OR legacy results with no output_id.
          (!activeOutputId || !r.output_id || r.output_id === activeOutputId)
      )
      .map((r) => {
        const payload = (r.payload ?? {}) as Record<string, unknown>;
        const hasGeometry =
          r.geometry != null && typeof r.geometry.start === "number";
        return {
          id: r.id!,
          start: hasGeometry ? Number(r.geometry!.start) : null,
          end: hasGeometry ? Number(r.geometry!.end) : null,
          answerText: String(
            payload.answer_text ??
            (hasGeometry ? r.geometry!.text : "") ??
            ""
          ),
          question: String(payload.question ?? ""),
        };
      });
  }, [results, meta.outputId]);

  // ── Text selection → pending span ─────────────────────────────────────────

  const handleMouseUp = useCallback(() => {
    if (readOnly) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

    const selectedStr = selection.toString();
    const range = selection.getRangeAt(0);

    if (
      !containerRef.current ||
      !containerRef.current.contains(range.commonAncestorContainer)
    ) {
      return;
    }

    // Compute char offsets — walk text nodes only, skipping annotation-UI nodes.
    // Use endContainer for `end` so the ✓ marker excluded by the walker
    // doesn't inflate the selection length (which would save wrong offsets).
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
    // Derive span text from source string, not the rendered DOM selection
    const spanText = contextText.slice(start, end);

    if (start >= end) return;

    setPendingSpan({ start, end, text: spanText });
    setFreeText(spanText); // pre-fill free-text with source span text
    selection.removeAllRanges();
  }, [readOnly, contextText]);

  // ── Confirm answer ────────────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    if (!pendingSpan && !freeText.trim()) return;

    const newResult: AnnotationResult = {
      id: `qa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      // Stamp output_id so multi-output ontologies can associate each QA answer
      // with the correct named_entity output definition.
      output_id: meta.outputId as string | undefined,
      // Use "ner" result_type to stay backend-compatible; payload.question
      // distinguishes QA results from plain NER spans.
      result_type: "ner",
      category_id: null,
      geometry: pendingSpan
        ? { start: pendingSpan.start, end: pendingSpan.end, text: pendingSpan.text }
        : null,
      payload: {
        question,
        answer_text: freeText.trim() || pendingSpan?.text || "",
      },
      created_at: new Date().toISOString(),
    };

    onChange?.([...results, newResult]);
    setPendingSpan(null);
    setFreeText("");
  }, [pendingSpan, freeText, question, results, onChange, meta.outputId]);

  const handleClear = useCallback(() => {
    setPendingSpan(null);
    setFreeText("");
  }, []);

  const handleDeleteAnswer = useCallback(
    (id: string) => {
      if (readOnly) return;
      const activeOutputId = meta.outputId as string | undefined;
      // Only delete QA answers belonging to this output (prevent cross-output mutation).
      // Legacy results with no output_id are treated as owned by this editor.
      onChange?.(results.filter((r) => {
        if (r.id !== id) return true; // not the target — keep
        if (activeOutputId && r.output_id && r.output_id !== activeOutputId) return true; // foreign output — keep
        return false; // delete
      }));
    },
    [readOnly, results, onChange, meta.outputId]
  );

  // ── Hotkeys ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClear();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !readOnly) {
        e.preventDefault();
        handleConfirm();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleClear, handleConfirm, readOnly]);

  // ── Render: annotated context text ────────────────────────────────────────

  const renderContext = useCallback(() => {
    const allSpans = [
      // Only render confirmed spans that have actual geometry (coordinates in context)
      ...qaSpans
        .filter((s): s is QaSpan & { start: number; end: number } =>
          s.start !== null && s.end !== null
        )
        .map((s) => ({ ...s, isPending: false as const })),
      // Pending span (in-progress)
      ...(pendingSpan
        ? [{ id: "__pending__", ...pendingSpan, answerText: pendingSpan.text, question, isPending: true as const }]
        : []),
    ].sort((a, b) => a.start - b.start);

    if (allSpans.length === 0) {
      return <span className="whitespace-pre-wrap">{contextText}</span>;
    }

    const elements: React.ReactNode[] = [];
    let lastIdx = 0;

    allSpans.forEach((span, i) => {
      if (span.start > lastIdx) {
        elements.push(
          <span key={`gap-${lastIdx}-${i}`}>
            {contextText.slice(lastIdx, span.start)}
          </span>
        );
      }

      elements.push(
        <span
          key={span.id}
          className={`inline-flex items-baseline rounded px-1 py-0.5 font-medium ${
            span.isPending
              ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400"
              : "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-600"
          }`}
        >
          {contextText.slice(span.start, span.end)}
          {!span.isPending && (
            <span
              className="ml-1 rounded bg-emerald-700/40 px-1 text-[9px] text-emerald-300"
              data-annotation-ui="true"
            >
              ✓
            </span>
          )}
        </span>
      );

      lastIdx = Math.max(lastIdx, span.end);
    });

    if (lastIdx < contextText.length) {
      elements.push(
        <span key="tail">{contextText.slice(lastIdx)}</span>
      );
    }

    return (
      <div className="whitespace-pre-wrap leading-relaxed">{elements}</div>
    );
  }, [contextText, qaSpans, pendingSpan, question]);

  // ── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      {/* LEFT: Context panel */}
      <div className="flex flex-1 flex-col border-r border-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 backdrop-blur">
          <span className="text-xs font-semibold text-slate-200">📄 Context</span>
          <span className="text-[11px] text-slate-400">
            • Bôi đen đoạn văn để chọn câu trả lời
          </span>
        </div>

        <div
          ref={containerRef}
          onMouseUp={handleMouseUp}
          className="flex-1 select-text overflow-y-auto p-5 font-mono text-sm leading-7 text-slate-300"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              Đang tải Context...
            </div>
          ) : contextText ? (
            renderContext()
          ) : (
            <div className="flex h-48 items-center justify-center text-xs text-slate-500">
              Không có dữ liệu văn bản Context.
            </div>
          )}
        </div>

        {/* Confirmed answers list */}
        {qaSpans.length > 0 && (
          <div className="border-t border-slate-800 p-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Câu trả lời đã xác nhận ({qaSpans.length})
            </p>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {qaSpans.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start justify-between rounded bg-emerald-950/40 px-2 py-1.5 text-xs"
                >
                  <span className="text-emerald-300 line-clamp-1 flex-1 pr-2">
                    "{s.answerText}"
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAnswer(s.id)}
                      aria-label="Xóa câu trả lời"
                      title="Xóa câu trả lời"
                      className="shrink-0 text-slate-600 hover:text-red-400"
                    >
                      <XCircle className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: QA panel */}
      <div className="flex w-72 shrink-0 flex-col bg-slate-900/50">
        {/* Question */}
        <div className="border-b border-slate-800 p-4">
          <div className="mb-1.5 flex items-center gap-1.5">
            <HelpCircle className="size-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-200">
              Câu hỏi
            </span>
          </div>
          {question ? (
            <p className="rounded bg-amber-950/30 px-3 py-2 text-xs leading-relaxed text-amber-200 ring-1 ring-amber-900/50">
              {question}
            </p>
          ) : (
            <p className="text-xs italic text-slate-500">
              Chưa có câu hỏi. Khai báo trong{" "}
              <code className="text-slate-400">metadata.question</code>.
            </p>
          )}
        </div>

        {/* Span preview */}
        <div className="border-b border-slate-800 p-4">
          <p className="mb-1.5 text-xs font-semibold text-slate-300">
            ✅ Answer Span
          </p>
          {pendingSpan ? (
            <div className="rounded bg-emerald-950/40 px-3 py-2 ring-1 ring-emerald-800/60">
              <p className="text-xs text-emerald-200 line-clamp-3">
                "{pendingSpan.text}"
              </p>
              <p className="mt-1 font-mono text-[10px] text-slate-500">
                offset: {pendingSpan.start} → {pendingSpan.end}
              </p>
            </div>
          ) : (
            <p className="text-xs italic text-slate-600">
              Chưa có span. Bôi đen văn bản bên trái.
            </p>
          )}
        </div>

        {/* Free-text override */}
        {allowFreeText && (
          <div className="border-b border-slate-800 p-4">
            <p className="mb-1.5 text-xs font-semibold text-slate-300">
              📝 Free-text (tuỳ chỉnh)
            </p>
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              disabled={readOnly}
              placeholder="Nhập hoặc sửa câu trả lời..."
              rows={3}
              className="w-full resize-none rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        )}

        {/* Action buttons */}
        {!readOnly && (
          <div className="p-4 flex gap-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={!pendingSpan && !freeText}
              className="flex flex-1 items-center justify-center gap-1.5 rounded border border-slate-700 px-3 py-2 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="size-3.5" />
              Clear
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!pendingSpan && !freeText.trim()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCheck className="size-3.5" />
              Confirm
              <span className="text-[10px] opacity-60">Ctrl+↵</span>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto border-t border-slate-900 px-4 py-2 text-[11px] text-slate-400">
          {qaSpans.length} câu trả lời · Esc: huỷ span
        </div>
      </div>
    </div>
  );
}
