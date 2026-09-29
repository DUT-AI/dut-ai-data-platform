"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Columns3,
  Key,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import { TabularFilterStatus } from "./tabular-types";
import { CategoryOption } from "./tabular-label-cell";

interface TabularToolbarProps {
  searchQuery: string;
  filterStatus: TabularFilterStatus;
  headers: string[];
  hiddenColumns: Set<string>;
  keyField: string;
  isKeyFieldSynthetic: boolean;
  categories: CategoryOption[];
  totalRows: number;
  labeledRowsCount: number;
  onSearchChange: (query: string) => void;
  onFilterChange: (status: TabularFilterStatus) => void;
  onToggleColumnVisibility: (column: string) => void;
  onSelectKeyField: (keyField: string) => void;
}

export function TabularToolbar({
  searchQuery,
  filterStatus,
  headers,
  hiddenColumns,
  keyField,
  isKeyFieldSynthetic,
  categories,
  totalRows,
  labeledRowsCount,
  onSearchChange,
  onFilterChange,
  onToggleColumnVisibility,
  onSelectKeyField,
}: TabularToolbarProps) {
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const [isKeyMenuOpen, setIsKeyMenuOpen] = useState(false);

  const colMenuRef = useRef<HTMLDivElement>(null);
  const keyMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        colMenuRef.current &&
        !colMenuRef.current.contains(e.target as Node)
      ) {
        setIsColMenuOpen(false);
      }
      if (
        keyMenuRef.current &&
        !keyMenuRef.current.contains(e.target as Node)
      ) {
        setIsKeyMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const progressPercent =
    totalRows > 0 ? Math.round((labeledRowsCount / totalRows) * 100) : 0;

  const visibleCount = headers.length - hiddenColumns.size;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-3 py-2 text-xs">
      {/* Left: Search & Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo ID, giá trị..."
            className="h-8 w-44 rounded-md border border-slate-700 bg-slate-950 pl-8 pr-7 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-hidden md:w-56"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Segmented Controls */}
        <div className="flex items-center rounded-md border border-slate-800 bg-slate-950 p-0.5">
          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              filterStatus === "all"
                ? "bg-slate-800 text-slate-100 shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => onFilterChange("labeled")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              filterStatus === "labeled"
                ? "bg-emerald-950/80 text-emerald-300 shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Đã gán
          </button>
          <button
            type="button"
            onClick={() => onFilterChange("unlabeled")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              filterStatus === "unlabeled"
                ? "bg-amber-950/80 text-amber-300 shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Chưa gán
          </button>
        </div>

        {/* Category specific filter dropdown */}
        {categories.length > 0 && (
          <div className="relative">
            <select
              value={
                filterStatus !== "all" &&
                filterStatus !== "labeled" &&
                filterStatus !== "unlabeled"
                  ? filterStatus
                  : ""
              }
              onChange={(e) => {
                const val = e.target.value;
                onFilterChange(val ? val : "all");
              }}
              className="h-8 rounded-md border border-slate-800 bg-slate-950 px-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">Lọc theo nhãn...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Key Field, Columns, and Progress */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Key Field Switcher */}
        <div className="relative" ref={keyMenuRef}>
          <button
            type="button"
            onClick={() => setIsKeyMenuOpen(!isKeyMenuOpen)}
            title="Định danh khóa chính dòng dữ liệu (record_key)"
            className="flex h-8 items-center gap-1.5 rounded-md border border-slate-800 bg-slate-950 px-2.5 text-xs text-slate-300 hover:bg-slate-900"
          >
            <Key className="h-3 w-3 text-blue-400" />
            <span className="font-mono text-slate-400">ID:</span>
            <span className="font-mono font-semibold text-blue-300">
              {keyField}
            </span>
            {isKeyFieldSynthetic && (
              <span className="rounded-xs bg-amber-950/60 px-1 text-[9px] text-amber-400">
                tự sinh
              </span>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>

          {isKeyMenuOpen && (
            <div className="absolute right-0 top-full z-40 mt-1 max-h-56 w-52 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-1 shadow-xl">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Chọn cột định danh (ID)
              </div>
              {headers.map((h) => {
                const isSelected = h === keyField;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      onSelectKeyField(h);
                      setIsKeyMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs ${
                      isSelected
                        ? "bg-blue-950/70 font-semibold text-blue-300"
                        : "text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    <span className="truncate font-mono">{h}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-blue-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Columns Visibility Popover */}
        <div className="relative" ref={colMenuRef}>
          <button
            type="button"
            onClick={() => setIsColMenuOpen(!isColMenuOpen)}
            className="flex h-8 items-center gap-1.5 rounded-md border border-slate-800 bg-slate-950 px-2.5 text-xs text-slate-300 hover:bg-slate-900"
          >
            <Columns3 className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Cột ({visibleCount}/{headers.length})
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>

          {isColMenuOpen && (
            <div className="absolute right-0 top-full z-40 mt-1 max-h-60 w-56 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-2 shadow-xl">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Ẩn / Hiện cột dữ liệu
              </div>
              <div className="space-y-1">
                {headers.map((col) => {
                  const isVisible = !hiddenColumns.has(col);
                  const isKey = col === keyField;
                  return (
                    <label
                      key={col}
                      className={`flex items-center gap-2 rounded px-1.5 py-1 text-xs select-none ${
                        isKey ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-slate-900 text-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={isKey}
                        checked={isVisible}
                        onChange={() => onToggleColumnVisibility(col)}
                        className="size-3.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate font-mono">{col}</span>
                      {isKey && (
                        <span className="ml-auto text-[9px] text-blue-400 font-sans">
                          (Khóa)
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Progress Counter & Mini Progress Bar */}
        <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-slate-400">Tiến độ:</span>
              <strong className="text-emerald-400">
                {labeledRowsCount}
              </strong>
              <span className="text-slate-500">/</span>
              <span className="text-slate-300">{totalRows}</span>
              <span className="text-[10px] font-bold text-slate-400">
                ({progressPercent}%)
              </span>
            </div>
            <div className="mt-0.5 h-1 w-24 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
