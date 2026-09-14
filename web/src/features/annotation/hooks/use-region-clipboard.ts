"use client";

import { useEffect, useCallback, useRef } from "react";
import type { AnnotationResult } from "../types";

export interface UseRegionClipboardOptions {
  selectedRegionId: string | null;
  results: AnnotationResult[];
  onAddResults: (newResults: AnnotationResult[]) => void;
  onDeleteSelected: (id: string) => void;
  enabled?: boolean;
}

const isFocusableElement = (el: Element | null): boolean => {
  if (!el) return false;
  return (
    el.matches(
      "input, textarea, select, [contenteditable='true'], [contenteditable='']"
    ) || el.getAttribute("tabindex") === "0"
  );
};

/**
 * Handles Ctrl+C (copy), Ctrl+X (cut), and Ctrl+V (paste) for annotation regions
 * Adapted from Label Studio useRegionsCopyPaste.ts
 */
export function useRegionClipboard({
  selectedRegionId,
  results,
  onAddResults,
  onDeleteSelected,
  enabled = true,
}: UseRegionClipboardOptions) {
  const selectedRef = useRef(selectedRegionId);
  const resultsRef = useRef(results);

  useEffect(() => {
    selectedRef.current = selectedRegionId;
    resultsRef.current = results;
  }, [selectedRegionId, results]);

  const handleCopy = useCallback(
    (e: ClipboardEvent) => {
      if (!enabled || isFocusableElement(document.activeElement)) return;
      const currentId = selectedRef.current;
      if (!currentId) return;

      const targetResult = resultsRef.current.find(
        (r) => (r.id || r.output_id) === currentId
      );
      if (!targetResult) return;

      e.clipboardData?.setData(
        "application/json",
        JSON.stringify({
          type: "dut_annotation_region",
          data: targetResult,
        })
      );
      e.preventDefault();
    },
    [enabled]
  );

  const handleCut = useCallback(
    (e: ClipboardEvent) => {
      if (!enabled || isFocusableElement(document.activeElement)) return;
      const currentId = selectedRef.current;
      if (!currentId) return;

      handleCopy(e);
      onDeleteSelected(currentId);
    },
    [enabled, handleCopy, onDeleteSelected]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!enabled || isFocusableElement(document.activeElement)) return;
      const rawData = e.clipboardData?.getData("application/json");
      if (!rawData) return;

      try {
        const parsed = JSON.parse(rawData);
        if (parsed.type === "dut_annotation_region" && parsed.data) {
          const original: AnnotationResult = parsed.data;
          const newId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

          // Offset spatial geometry slightly so duplicate doesn't completely overlap
          const newGeometry = original.geometry
            ? { ...original.geometry }
            : null;
          if (newGeometry) {
            if (typeof newGeometry.x === "number") newGeometry.x += 15;
            if (typeof newGeometry.y === "number") newGeometry.y += 15;
            if (Array.isArray(newGeometry.points)) {
              newGeometry.points = newGeometry.points.map(([x, y]) => [
                x + 15,
                y + 15,
              ]);
            }
          }

          const pastedResult: AnnotationResult = {
            ...original,
            id: newId,
            geometry: newGeometry,
            created_at: new Date().toISOString(),
          };

          onAddResults([pastedResult]);
          e.preventDefault();
        }
      } catch {
        // Ignore non-json clipboard payloads
      }
    },
    [enabled, onAddResults]
  );

  useEffect(() => {
    if (!enabled) return;
    const onCopyListener = (e: Event) => handleCopy(e as ClipboardEvent);
    const onCutListener = (e: Event) => handleCut(e as ClipboardEvent);
    const onPasteListener = (e: Event) => handlePaste(e as ClipboardEvent);

    window.addEventListener("copy", onCopyListener);
    window.addEventListener("cut", onCutListener);
    window.addEventListener("paste", onPasteListener);

    return () => {
      window.removeEventListener("copy", onCopyListener);
      window.removeEventListener("cut", onCutListener);
      window.removeEventListener("paste", onPasteListener);
    };
  }, [enabled, handleCopy, handleCut, handlePaste]);
}
