"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { AlignLeft, CheckCircle2, Circle } from "lucide-react";
import { AnnotationResult } from "../types";
import { BaseEditorComponentProps } from "../registry/editor-registry";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

let _classIdCounter = 0;
function generateId(catId: string): string {
  _classIdCounter += 1;
  return `class_${catId}_${_classIdCounter}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface TextClassificationCanvasProps extends BaseEditorComponentProps {
  /** Inline text to display — fallback when assetUrl is absent */
  textContent?: string;
  /**
   * Allow selecting multiple labels simultaneously.
   * Can also be supplied via `metadata.multiple`.
   * Defaults to false (single-label / radio style).
   */
  multiple?: boolean;
}

export function TextClassificationCanvas({
  assetUrl,
  textContent: textContentProp,
  results,
  categoryColors = {},
  categoryNames = {},
  availableCategories = [],
  readOnly = false,
  multiple: multipleProp,
  onChange,
  metadata,
}: TextClassificationCanvasProps) {
  const [text, setText] = useState<string>(textContentProp ?? "");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Resolve `multiple` from prop OR metadata (frontend-only — backend unaware)
  // `!!` always produces a boolean so no `?? false` fallback is needed.
  const isMultiple: boolean =
    multipleProp ??
    !!(metadata as Record<string, unknown> | undefined)?.multiple;

  // Fetch text content: assetUrl first → metadata.textContent fallback
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

  // ── Derived state ─────────────────────────────────────────────────────────

  const selectedIds: string[] = useMemo(
    () =>
      results
        .filter((r) => r.result_type === "classification" && r.category_id)
        .map((r) => r.category_id as string),
    [results]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggle = useCallback(
    (catId: string) => {
      if (readOnly) return;

      if (isMultiple) {
        // Checkbox style: toggle independently
        if (selectedIds.includes(catId)) {
          onChange?.(
            results.filter(
              (r) =>
                !(r.result_type === "classification" && r.category_id === catId)
            )
          );
        } else {
          onChange?.([
            ...results,
            {
              id: generateId(catId),
              result_type: "classification",
              category_id: catId,
              value: catId,
              created_at: new Date().toISOString(),
            } satisfies AnnotationResult,
          ]);
        }
      } else {
        // Radio style: selecting new → deselect all previous
        const withoutClassification = results.filter(
          (r) => r.result_type !== "classification"
        );
        if (selectedIds.includes(catId)) {
          // Clicking selected item deselects it
          onChange?.(withoutClassification);
        } else {
          onChange?.([
            ...withoutClassification,
            {
              id: generateId(catId),
              result_type: "classification",
              category_id: catId,
              value: catId,
              created_at: new Date().toISOString(),
            } satisfies AnnotationResult,
          ]);
        }
      }
    },
    [readOnly, isMultiple, selectedIds, results, onChange]
  );

  // ── Hotkeys: 1-9 toggle category ─────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const digit = parseInt(e.key, 10);
      if (isNaN(digit) || digit < 1 || digit > 9) return;
      const cat = availableCategories[digit - 1];
      if (cat) handleToggle(cat.id);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [availableCategories, handleToggle]);

  // ── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      {/* LEFT: Text display */}
      <div className="flex flex-1 flex-col border-r border-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 backdrop-blur">
          <AlignLeft className="size-4 text-sky-400" />
          <span className="text-xs font-semibold text-slate-200">
            Văn bản
          </span>
          <span className="text-[11px] text-slate-400">• Đọc và phân loại đoạn văn</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 font-mono text-sm leading-7 text-slate-300">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              Đang tải dữ liệu văn bản...
            </div>
          ) : text ? (
            <span className="whitespace-pre-wrap">{text}</span>
          ) : (
            <div className="flex h-48 items-center justify-center text-xs text-slate-500">
              Không có dữ liệu văn bản.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Label picker */}
      <div className="flex w-64 shrink-0 flex-col bg-slate-900/50">
        <div className="border-b border-slate-800 px-4 py-2.5">
          <p className="text-xs font-semibold text-slate-200">
            Phân Loại{" "}
            <span className="ml-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-normal text-slate-400">
              {isMultiple ? "Nhiều lựa chọn" : "Một lựa chọn"}
            </span>
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Phím tắt: 1–{Math.min(availableCategories.length, 9)}
          </p>
        </div>

        {/* Category buttons */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {availableCategories.length === 0 ? (
            <p className="text-center text-xs text-slate-500 pt-6">
              Chưa có nhãn nào được định nghĩa.
            </p>
          ) : (
            availableCategories.map((cat, idx) => {
              const isSelected = selectedIds.includes(cat.id);
              const color =
                cat.color ?? categoryColors[cat.id] ?? "#6366F1";

              return (
                <button
                  key={cat.id}
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleToggle(cat.id)}
                  style={{
                    borderColor: isSelected ? color : "rgba(51,65,85,0.5)",
                    backgroundColor: isSelected
                      ? `${color}18`
                      : "rgba(15,23,42,0.3)",
                  }}
                  className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left transition-all ${
                    isSelected
                      ? "shadow-sm ring-1 ring-blue-500/30"
                      : "hover:border-slate-600 hover:bg-slate-800/40"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-medium text-slate-100">
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {idx + 1}
                    </span>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="size-4 shrink-0 text-blue-400" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-slate-700" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Selected summary */}
        {selectedIds.length > 0 && (
          <div className="border-t border-slate-800 p-3">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Đã chọn
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedIds.map((catId) => {
                const cat = availableCategories.find((c) => c.id === catId);
                const color = cat?.color ?? categoryColors[catId] ?? "#6366F1";
                return (
                  <span
                    key={catId}
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {cat?.name ?? categoryNames[catId] ?? catId}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-900 px-4 py-2 text-[11px] text-slate-400">
          {selectedIds.length} / {availableCategories.length} nhãn đã chọn
        </div>
      </div>
    </div>
  );
}
