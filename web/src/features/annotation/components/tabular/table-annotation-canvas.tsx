"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AnnotationResult } from "../../types";
import { Table } from "lucide-react";

export interface TableAnnotationCanvasProps {
  tableUrl?: string;
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

export function TableAnnotationCanvas({
  tableUrl,
  results,
  categoryColors = {},
  categoryNames = {},
  selectedCategoryId,
  readOnly = false,
  onChange,
}: TableAnnotationCanvasProps) {
  const [dataRows, setDataRows] = useState<Array<Record<string, unknown>>>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Parse CSV / JSON from tableUrl
  useEffect(() => {
    if (!tableUrl) return;

    let isMounted = true;
    const abortController = new AbortController();

    fetch(tableUrl, { signal: abortController.signal })
      .then((res) => {
        if (isMounted) setIsLoading(true);
        return res.text();
      })
      .then((text) => {
        if (!isMounted) return;

        // Try JSON first
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cols = Object.keys(parsed[0]);
            setHeaders(cols);
            setDataRows(parsed as Array<Record<string, unknown>>);
            setIsLoading(false);
            return;
          }
        } catch {
          // Continue to CSV parsing
        }

        // Basic CSV Parser
        const lines = text
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length > 0) {
          const rawHeaders = lines[0]
            .split(",")
            .map((h) => h.trim().replace(/^["']|["']$/g, ""));
          setHeaders(rawHeaders);

          const rows: Array<Record<string, unknown>> = [];
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i]
              .split(",")
              .map((v) => v.trim().replace(/^["']|["']$/g, ""));
            const rowObj: Record<string, unknown> = {};
            rawHeaders.forEach((h, idx) => {
              rowObj[h] = values[idx] ?? "";
            });
            rows.push(rowObj);
          }
          setDataRows(rows);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted || err.name === "AbortError") return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [tableUrl]);

  const getColor = useCallback(
    (catId?: string | null, idx = 0) => {
      if (catId && categoryColors[catId]) return categoryColors[catId];
      return DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    },
    [categoryColors]
  );

  // Handle click on cell to tag
  const handleCellClick = (rIdx: number, colName: string, cellVal: unknown) => {
    if (readOnly) return;
    const cellId = `table_${rIdx}_${colName}`;

    // Toggle or overwrite cell tag
    const existing = results.find(
      (r) =>
        r.result_type === "table_cell" &&
        r.geometry?.row === rIdx &&
        r.geometry?.col_name === colName
    );

    if (existing) {
      if (existing.category_id === selectedCategoryId) {
        // Remove tag if clicked with same active category
        const updated = results.filter((r) => r.id !== existing.id);
        onChange?.(updated);
        return;
      }
      // Overwrite with new category
      const updated = results.map((r) =>
        r.id === existing.id
          ? { ...r, category_id: selectedCategoryId || null }
          : r
      );
      onChange?.(updated);
      return;
    }

    const newResult: AnnotationResult = {
      id: cellId,
      result_type: "table_cell",
      category_id: selectedCategoryId || null,
      geometry: {
        row: rIdx,
        col_name: colName,
        value: cellVal,
      },
      created_at: new Date().toISOString(),
    };

    const updated = [...results, newResult];
    onChange?.(updated);
  };

  const getCellTag = (rIdx: number, colName: string) => {
    return results.find(
      (r) =>
        r.result_type === "table_cell" &&
        r.geometry?.row === rIdx &&
        r.geometry?.col_name === colName
    );
  };

  return (
    <div className="relative flex h-full min-h-[420px] w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      {/* Top action toolbar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <Table className="size-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">
            Dữ liệu Bảng (Tabular Annotation)
          </span>
          <span className="text-[11px] text-slate-400">
            • Click vào ô (Cell) để gán nhãn
          </span>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            Đang tải dữ liệu bảng...
          </div>
        ) : headers.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="w-12 border-b border-slate-800 px-3 py-2 text-center">
                    #
                  </th>
                  {headers.map((h) => (
                    <th key={h} className="border-b border-slate-800 px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {dataRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="transition-colors hover:bg-slate-900/40"
                  >
                    <td className="px-3 py-2 text-center text-slate-500">
                      {rIdx + 1}
                    </td>
                    {headers.map((col) => {
                      const tag = getCellTag(rIdx, col);
                      const color = tag ? getColor(tag.category_id) : undefined;
                      const labelName = tag?.category_id
                        ? categoryNames[tag.category_id] || "Tag"
                        : "";

                      return (
                        <td
                          key={col}
                          onClick={() => handleCellClick(rIdx, col, row[col])}
                          style={{
                            backgroundColor: tag ? `${color}25` : undefined,
                            borderLeft: tag ? `3px solid ${color}` : undefined,
                          }}
                          className="relative cursor-pointer px-3 py-2 transition-colors duration-150 hover:bg-blue-950/20"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>{String(row[col] ?? "")}</span>
                            {tag && (
                              <span
                                style={{ backgroundColor: color }}
                                className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
                              >
                                {labelName}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            Không có dữ liệu bảng dạng CSV hoặc JSON.
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-slate-900 bg-slate-950 px-4 py-2 text-[11px] text-slate-400">
        <div>
          Tổng số ô đã gán nhãn:{" "}
          <strong className="text-slate-200">
            {results.filter((r) => r.result_type === "table_cell").length}
          </strong>
        </div>
        <div className="font-mono text-[10px]">
          {dataRows.length} hàng × {headers.length} cột
        </div>
      </div>
    </div>
  );
}
