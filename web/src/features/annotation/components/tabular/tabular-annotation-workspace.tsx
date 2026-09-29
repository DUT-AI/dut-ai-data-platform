"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AnnotationResult } from "../../types";
import {
  TabularRow,
  TabularRecordResult,
  TabularFilterStatus,
  TabularSortConfig,
  TabularLabelMode,
} from "./tabular-types";
import { parseTabularData, detectRecordKeyField } from "./tabular-parser";
import { TabularToolbar } from "./tabular-toolbar";
import { TabularDataGrid } from "./tabular-data-grid";
import { TabularBulkActionBar } from "./tabular-bulk-action-bar";
import { TabularPagination } from "./tabular-pagination";
import { CategoryOption } from "./tabular-label-cell";

export interface TabularAnnotationWorkspaceProps {
  tableUrl?: string;
  assetUrl?: string;
  results: AnnotationResult[];
  categoryColors?: Record<string, string>;
  categoryNames?: Record<string, string>;
  selectedCategoryId?: string | null;
  availableCategories?: CategoryOption[];
  outputId?: string;
  outputMultiple?: boolean;
  outputTypeCode?: string;
  readOnly?: boolean;
  onChange?: (results: AnnotationResult[]) => void;
  metadata?: Record<string, unknown>;
}

export function TabularAnnotationWorkspace({
  tableUrl,
  assetUrl,
  results,
  categoryColors = {},
  categoryNames = {},
  selectedCategoryId,
  availableCategories = [],
  outputId,
  outputMultiple,
  outputTypeCode,
  readOnly = false,
  onChange,
  metadata,
}: TabularAnnotationWorkspaceProps) {
  const effectiveUrl = assetUrl || tableUrl;

  // Data state
  const [dataRows, setDataRows] = useState<TabularRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [keyField, setKeyField] = useState<string>("id");
  const [isKeyFieldSynthetic, setIsKeyFieldSynthetic] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState<number>(0);

  // UI state
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(25);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<TabularFilterStatus>("all");
  const [sortConfig, setSortConfig] = useState<TabularSortConfig | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null);
  const [lastSelectedKey, setLastSelectedKey] = useState<string | null>(null);

  // 1. Fetch & parse tabular data
  useEffect(() => {
    if (!effectiveUrl) return;

    const abortController = new AbortController();
    let ignore = false;

    // Use microtask to avoid calling setState synchronously in effect body
    Promise.resolve().then(() => {
      if (!ignore) {
        setIsLoading(true);
        setLoadError(null);
      }
    });

    fetch(effectiveUrl, { signal: abortController.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.text();
      })
      .then((text) => {
        if (ignore) return;
        const { headers: parsedHeaders, rows: parsedRows } =
          parseTabularData(text);
        if (parsedHeaders.length === 0) {
          setDataRows([]);
          setHeaders([]);
          setIsLoading(false);
          return;
        }

        const { keyField: detectedKey, isSynthetic } = detectRecordKeyField(
          parsedHeaders,
          parsedRows
        );

        setHeaders(parsedHeaders);
        setDataRows(parsedRows);
        setKeyField(detectedKey);
        setIsKeyFieldSynthetic(isSynthetic);
        setIsLoading(false);

        // Auto-focus the first record if available
        if (parsedRows.length > 0) {
          const firstKey = String(parsedRows[0][detectedKey] ?? "row_1");
          setFocusedRowKey(firstKey);
        }
      })
      .catch((err) => {
        if (err.name === "AbortError" || ignore) return;
        setIsLoading(false);
        setLoadError(err.message || "Không thể tải tập tin dữ liệu bảng.");
      });

    return () => {
      ignore = true;
      abortController.abort();
    };
  }, [effectiveUrl, reloadToken]);

  // 2. Determine effective Label Mode from output definitions / metadata
  const labelMode: TabularLabelMode = useMemo(() => {
    const resolvedOutputType =
      outputTypeCode || (metadata?.outputType as string | undefined);
    const resolvedMultiple =
      outputMultiple !== undefined
        ? outputMultiple
        : !!metadata?.multiple;

    if (resolvedOutputType === "number") {
      return "number";
    }
    if (resolvedMultiple) {
      return "multi-label";
    }
    if (availableCategories.length === 2) {
      return "binary";
    }
    return "single-class";
  }, [outputTypeCode, outputMultiple, metadata, availableCategories.length]);

  // 3. Helper to get recordKey for a row
  const getRecordKey = useCallback(
    (row: TabularRow, originalIdx?: number): string => {
      const val = row[keyField];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val);
      }
      return `row_${(originalIdx ?? 0) + 1}`;
    },
    [keyField]
  );

  // 4. Map existing annotations to a fast lookup by record_key
  const { rowResultMap, otherResults } = useMemo(() => {
    const map = new Map<string, TabularRecordResult>();
    const others: AnnotationResult[] = [];

    results.forEach((r) => {
      const geom = r.geometry as
        | { record_key?: string; key_field?: string; [key: string]: unknown }
        | undefined;
      const recKey =
        geom?.record_key ??
        (r.id && r.id.startsWith("rec_result__")
          ? r.id.replace("rec_result__", "")
          : undefined);

      if (recKey && r.result_type !== "table_cell") {
        map.set(recKey, r as TabularRecordResult);
      } else {
        others.push(r);
      }
    });

    return { rowResultMap: map, otherResults: others };
  }, [results]);

  // 5. Search, Filter, and Sort data
  const filteredAndSortedRows = useMemo(() => {
    let rows = [...dataRows];

    // Search query filter
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase().trim();
      rows = rows.filter((row, idx) => {
        const recKey = getRecordKey(row, idx);
        if (recKey.toLowerCase().includes(query)) return true;
        return Object.values(row).some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(query);
        });
      });
    }

    // Filter by labeled / unlabeled status or specific category
    if (filterStatus === "labeled") {
      rows = rows.filter((row, idx) => {
        const recKey = getRecordKey(row, idx);
        const res = rowResultMap.get(recKey);
        if (!res) return false;
        if (labelMode === "number") {
          return res.value !== undefined && res.value !== null;
        }
        if (labelMode === "multi-label") {
          return Array.isArray(res.value) && (res.value as string[]).length > 0;
        }
        return !!res.category_id;
      });
    } else if (filterStatus === "unlabeled") {
      rows = rows.filter((row, idx) => {
        const recKey = getRecordKey(row, idx);
        const res = rowResultMap.get(recKey);
        if (!res) return true;
        if (labelMode === "number") {
          return res.value === undefined || res.value === null;
        }
        if (labelMode === "multi-label") {
          return !Array.isArray(res.value) || (res.value as string[]).length === 0;
        }
        return !res.category_id;
      });
    } else if (filterStatus !== "all") {
      // Filter by specific category ID
      rows = rows.filter((row, idx) => {
        const recKey = getRecordKey(row, idx);
        const res = rowResultMap.get(recKey);
        if (!res) return false;
        if (labelMode === "multi-label" && Array.isArray(res.value)) {
          return (res.value as string[]).includes(filterStatus);
        }
        return res.category_id === filterStatus;
      });
    }

    // Sort column
    if (sortConfig) {
      const { column, direction } = sortConfig;
      rows.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined || valA === "") return 1;
        if (valB === null || valB === undefined || valB === "") return -1;

        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return direction === "asc" ? numA - numB : numB - numA;
        }

        const cmp = String(valA).localeCompare(String(valB));
        return direction === "asc" ? cmp : -cmp;
      });
    }

    return rows;
  }, [dataRows, searchQuery, filterStatus, sortConfig, rowResultMap, labelMode, getRecordKey]);

  // Derive effective page index safely without triggering cascading renders in an effect
  const maxPage = Math.max(0, Math.ceil(filteredAndSortedRows.length / pageSize) - 1);
  const effectivePageIndex = Math.min(pageIndex, maxPage);

  // Paginated rows for current page
  const pageStartIndex = effectivePageIndex * pageSize;
  const pageRows = useMemo(() => {
    return filteredAndSortedRows.slice(pageStartIndex, pageStartIndex + pageSize);
  }, [filteredAndSortedRows, pageStartIndex, pageSize]);

  // Visible feature columns
  const visibleHeaders = useMemo(() => {
    return headers.filter((h) => !hiddenColumns.has(h));
  }, [headers, hiddenColumns]);

  // Total labeled rows counter
  const labeledRowsCount = useMemo(() => {
    let count = 0;
    dataRows.forEach((row, idx) => {
      const recKey = getRecordKey(row, idx);
      const res = rowResultMap.get(recKey);
      if (res) {
        if (labelMode === "number") {
          if (res.value !== undefined && res.value !== null) count++;
        } else if (labelMode === "multi-label") {
          if (Array.isArray(res.value) && (res.value as string[]).length > 0) count++;
        } else if (res.category_id) {
          count++;
        }
      }
    });
    return count;
  }, [dataRows, rowResultMap, labelMode, getRecordKey]);

  // 6. Action Handlers for Labeling

  // Select Single Category for a Row
  const handleSelectCategory = useCallback(
    (recordKey: string, categoryId: string) => {
      if (readOnly) return;
      const effectiveOutputId =
        outputId || (metadata?.outputId as string | undefined);

      const newResult: TabularRecordResult = {
        id: `rec_result__${recordKey}`,
        output_id: effectiveOutputId,
        result_type: "classification",
        category_id: categoryId,
        value: categoryId,
        geometry: {
          record_key: recordKey,
          key_field: keyField,
        },
        created_at: new Date().toISOString(),
      };

      const updatedMap = new Map(rowResultMap);
      updatedMap.set(recordKey, newResult);

      const newResults: AnnotationResult[] = [
        ...otherResults,
        ...Array.from(updatedMap.values()),
      ];
      onChange?.(newResults);
    },
    [readOnly, outputId, metadata, keyField, rowResultMap, otherResults, onChange]
  );

  // Toggle Multi-label Category for a Row
  const handleToggleMultiCategory = useCallback(
    (recordKey: string, categoryId: string) => {
      if (readOnly) return;
      const effectiveOutputId =
        outputId || (metadata?.outputId as string | undefined);
      const existing = rowResultMap.get(recordKey);
      const currentList: string[] = Array.isArray(existing?.value)
        ? (existing?.value as string[])
        : existing?.category_id
          ? [existing.category_id]
          : [];

      let updatedList: string[];
      if (currentList.includes(categoryId)) {
        updatedList = currentList.filter((c) => c !== categoryId);
      } else {
        updatedList = [...currentList, categoryId];
      }

      const updatedMap = new Map(rowResultMap);
      if (updatedList.length === 0) {
        updatedMap.delete(recordKey);
      } else {
        const newResult: TabularRecordResult = {
          id: `rec_result__${recordKey}`,
          output_id: effectiveOutputId,
          result_type: "classification",
          category_id: updatedList[0] || null,
          value: updatedList,
          geometry: {
            record_key: recordKey,
            key_field: keyField,
          },
          created_at: new Date().toISOString(),
        };
        updatedMap.set(recordKey, newResult);
      }

      const newResults: AnnotationResult[] = [
        ...otherResults,
        ...Array.from(updatedMap.values()),
      ];
      onChange?.(newResults);
    },
    [readOnly, outputId, metadata, keyField, rowResultMap, otherResults, onChange]
  );

  // Set Numeric Value for a Row
  const handleSetNumericValue = useCallback(
    (recordKey: string, val: number | null) => {
      if (readOnly) return;
      const effectiveOutputId =
        outputId || (metadata?.outputId as string | undefined);

      const updatedMap = new Map(rowResultMap);
      if (val === null) {
        updatedMap.delete(recordKey);
      } else {
        const newResult: TabularRecordResult = {
          id: `rec_result__${recordKey}`,
          output_id: effectiveOutputId,
          result_type: "number",
          value: val,
          geometry: {
            record_key: recordKey,
            key_field: keyField,
          },
          created_at: new Date().toISOString(),
        };
        updatedMap.set(recordKey, newResult);
      }

      const newResults: AnnotationResult[] = [
        ...otherResults,
        ...Array.from(updatedMap.values()),
      ];
      onChange?.(newResults);
    },
    [readOnly, outputId, metadata, keyField, rowResultMap, otherResults, onChange]
  );

  // Clear Label for a Row
  const handleClearLabel = useCallback(
    (recordKey: string) => {
      if (readOnly) return;
      const updatedMap = new Map(rowResultMap);
      updatedMap.delete(recordKey);

      const newResults: AnnotationResult[] = [
        ...otherResults,
        ...Array.from(updatedMap.values()),
      ];
      onChange?.(newResults);
    },
    [readOnly, rowResultMap, otherResults, onChange]
  );

  // Apply Label to All Selected Rows (Bulk)
  const handleApplyLabelToSelected = useCallback(
    (categoryId: string) => {
      if (readOnly || selectedRowKeys.size === 0) return;
      const effectiveOutputId =
        outputId || (metadata?.outputId as string | undefined);

      const updatedMap = new Map(rowResultMap);
      selectedRowKeys.forEach((key) => {
        const newResult: TabularRecordResult = {
          id: `rec_result__${key}`,
          output_id: effectiveOutputId,
          result_type: "classification",
          category_id: categoryId,
          value: labelMode === "multi-label" ? [categoryId] : categoryId,
          geometry: {
            record_key: key,
            key_field: keyField,
          },
          created_at: new Date().toISOString(),
        };
        updatedMap.set(key, newResult);
      });

      const newResults: AnnotationResult[] = [
        ...otherResults,
        ...Array.from(updatedMap.values()),
      ];
      onChange?.(newResults);
      setSelectedRowKeys(new Set());
    },
    [readOnly, selectedRowKeys, outputId, metadata, keyField, labelMode, rowResultMap, otherResults, onChange]
  );

  // Clear Labels for All Selected Rows (Bulk)
  const handleClearSelectedLabels = useCallback(() => {
    if (readOnly || selectedRowKeys.size === 0) return;
    const updatedMap = new Map(rowResultMap);
    selectedRowKeys.forEach((key) => {
      updatedMap.delete(key);
    });

    const newResults: AnnotationResult[] = [
      ...otherResults,
      ...Array.from(updatedMap.values()),
    ];
    onChange?.(newResults);
    setSelectedRowKeys(new Set());
  }, [readOnly, selectedRowKeys, rowResultMap, otherResults, onChange]);

  // Row selection handler with Shift+Click range selection
  const handleSelectRow = useCallback(
    (recordKey: string, isShift: boolean) => {
      setSelectedRowKeys((prev: Set<string>) => {
        const next = new Set(prev);

        if (isShift && lastSelectedKey) {
          // Range selection
          const keys = pageRows.map((r, i) => getRecordKey(r, i));
          const idxA = keys.indexOf(lastSelectedKey);
          const idxB = keys.indexOf(recordKey);

          if (idxA !== -1 && idxB !== -1) {
            const start = Math.min(idxA, idxB);
            const end = Math.max(idxA, idxB);
            for (let i = start; i <= end; i++) {
              next.add(keys[i]);
            }
            return next;
          }
        }

        if (next.has(recordKey)) {
          next.delete(recordKey);
        } else {
          next.add(recordKey);
        }
        return next;
      });
      setLastSelectedKey(recordKey);
      setFocusedRowKey(recordKey);
    },
    [pageRows, getRecordKey, lastSelectedKey]
  );

  // Toggle select all on current page
  const handleToggleSelectAllPage = useCallback(() => {
    const pageKeys = pageRows.map((r, i) => getRecordKey(r, i));
    const allSelected = pageKeys.every((k: string) => selectedRowKeys.has(k));

    setSelectedRowKeys((prev: Set<string>) => {
      const next = new Set(prev);
      if (allSelected) {
        pageKeys.forEach((k: string) => next.delete(k));
      } else {
        pageKeys.forEach((k: string) => next.add(k));
      }
      return next;
    });
  }, [pageRows, getRecordKey, selectedRowKeys]);

  // Sort toggler
  const handleSortColumn = useCallback((column: string) => {
    setSortConfig((prev: TabularSortConfig | null) => {
      if (prev?.column === column) {
        if (prev.direction === "asc") {
          return { column, direction: "desc" };
        }
        return null;
      }
      return { column, direction: "asc" };
    });
  }, []);

  // Column visibility toggler
  const handleToggleColumnVisibility = useCallback((column: string) => {
    setHiddenColumns((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      return next;
    });
  }, []);

  // Auto-advance focus to next row
  const advanceToNextRow = useCallback(() => {
    if (!focusedRowKey) return;
    const pageKeys = pageRows.map((r, i) => getRecordKey(r, i));
    const currentIdx = pageKeys.indexOf(focusedRowKey);
    if (currentIdx !== -1 && currentIdx < pageKeys.length - 1) {
      setFocusedRowKey(pageKeys[currentIdx + 1]);
    } else if (
      currentIdx === pageKeys.length - 1 &&
      pageIndex < Math.ceil(filteredAndSortedRows.length / pageSize) - 1
    ) {
      // Advance to next page
      setPageIndex((p: number) => p + 1);
    }
  }, [focusedRowKey, pageRows, getRecordKey, pageIndex, filteredAndSortedRows.length, pageSize]);

  // Move focus up/down
  const moveFocus = useCallback(
    (direction: "up" | "down") => {
      const pageKeys = pageRows.map((r, i) => getRecordKey(r, i));
      if (pageKeys.length === 0) return;

      if (!focusedRowKey) {
        setFocusedRowKey(pageKeys[0]);
        return;
      }

      const idx = pageKeys.indexOf(focusedRowKey);
      if (direction === "down") {
        if (idx !== -1 && idx < pageKeys.length - 1) {
          setFocusedRowKey(pageKeys[idx + 1]);
        }
      } else {
        if (idx > 0) {
          setFocusedRowKey(pageKeys[idx - 1]);
        }
      }
    },
    [focusedRowKey, pageRows, getRecordKey]
  );

  // 7. Keyboard Navigation & Auto-advance Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "SELECT"
      ) {
        return;
      }

      // Deselect all on Escape
      if (e.key === "Escape") {
        if (selectedRowKeys.size > 0) {
          e.preventDefault();
          setSelectedRowKeys(new Set());
        }
        return;
      }

      // Navigate rows with ArrowUp / ArrowDown or J / K
      if (e.key === "ArrowDown" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        moveFocus("down");
        return;
      }
      if (e.key === "ArrowUp" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        moveFocus("up");
        return;
      }

      // Space toggles selection on focused row
      if (e.key === " " && focusedRowKey) {
        e.preventDefault();
        handleSelectRow(focusedRowKey, e.shiftKey);
        return;
      }

      // Delete or Backspace clears label on focused row
      if ((e.key === "Delete" || e.key === "Backspace") && focusedRowKey) {
        if (!readOnly) {
          e.preventDefault();
          handleClearLabel(focusedRowKey);
        }
        return;
      }

      // Enter key assigns currently selected category from workspace category bar
      if (e.key === "Enter" && focusedRowKey && selectedCategoryId && !readOnly) {
        e.preventDefault();
        handleSelectCategory(focusedRowKey, selectedCategoryId);
        advanceToNextRow();
        return;
      }

      // Shortcuts 1 to 9: Assign category to focused row and auto-advance
      if (/^[1-9]$/.test(e.key) && focusedRowKey && !readOnly) {
        const catIndex = parseInt(e.key, 10) - 1;
        if (catIndex < availableCategories.length) {
          e.preventDefault();
          const targetCat = availableCategories[catIndex];
          handleSelectCategory(focusedRowKey, targetCat.id);
          advanceToNextRow();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    focusedRowKey,
    readOnly,
    availableCategories,
    selectedRowKeys.size,
    moveFocus,
    handleSelectRow,
    selectedCategoryId,
    handleClearLabel,
    handleSelectCategory,
    advanceToNextRow,
  ]);

  return (
    <div className="relative flex h-full min-h-[460px] w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
      {/* 1. Header Toolbar */}
      <TabularToolbar
        searchQuery={searchQuery}
        filterStatus={filterStatus}
        headers={headers}
        hiddenColumns={hiddenColumns}
        keyField={keyField}
        isKeyFieldSynthetic={isKeyFieldSynthetic}
        categories={availableCategories}
        totalRows={dataRows.length}
        labeledRowsCount={labeledRowsCount}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPageIndex(0);
        }}
        onFilterChange={(f) => {
          setFilterStatus(f);
          setPageIndex(0);
        }}
        onToggleColumnVisibility={handleToggleColumnVisibility}
        onSelectKeyField={(newKey) => {
          setKeyField(newKey);
          setIsKeyFieldSynthetic(false);
        }}
      />

      {/* 2. Main Data Grid */}
      <TabularDataGrid
        pageRows={pageRows}
        totalRowCount={dataRows.length}
        filteredRowCount={filteredAndSortedRows.length}
        pageStartIndex={pageStartIndex}
        headers={headers}
        visibleHeaders={visibleHeaders}
        keyField={keyField}
        isKeyFieldSynthetic={isKeyFieldSynthetic}
        rowResultMap={rowResultMap}
        categories={availableCategories}
        categoryColors={categoryColors}
        categoryNames={categoryNames}
        labelMode={labelMode}
        selectedRowKeys={selectedRowKeys}
        focusedRowKey={focusedRowKey}
        sortConfig={sortConfig}
        searchHighlight={searchQuery}
        readOnly={readOnly}
        isLoading={isLoading}
        errorMessage={loadError || undefined}
        onSelectRow={handleSelectRow}
        onToggleSelectAllPage={handleToggleSelectAllPage}
        onFocusRow={setFocusedRowKey}
        onSortColumn={handleSortColumn}
        onSelectCategory={handleSelectCategory}
        onToggleMultiCategory={handleToggleMultiCategory}
        onSetNumericValue={handleSetNumericValue}
        onClearLabel={handleClearLabel}
        onResetFilters={() => {
          setSearchQuery("");
          setFilterStatus("all");
          setPageIndex(0);
        }}
        onRetry={() => setReloadToken((t: number) => t + 1)}
      />

      {/* 3. Bulk Action Floating Bar */}
      <TabularBulkActionBar
        selectedCount={selectedRowKeys.size}
        categories={availableCategories}
        categoryColors={categoryColors}
        onApplyLabelToSelected={handleApplyLabelToSelected}
        onClearSelectedLabels={handleClearSelectedLabels}
        onDeselectAll={() => setSelectedRowKeys(new Set())}
      />

      {/* 4. Footer Pagination */}
      <TabularPagination
        pageIndex={effectivePageIndex}
        pageSize={pageSize}
        totalFilteredRows={filteredAndSortedRows.length}
        totalTotalRows={dataRows.length}
        onPageChange={setPageIndex}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPageIndex(0);
        }}
      />
    </div>
  );
}
