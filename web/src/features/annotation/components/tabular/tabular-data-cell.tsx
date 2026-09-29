"use client";

import React, { memo } from "react";

interface TabularDataCellProps {
  value: unknown;
  searchHighlight?: string;
}

export const TabularDataCell = memo(function TabularDataCell({
  value,
  searchHighlight,
}: TabularDataCellProps) {
  // Format null / undefined / empty
  if (value === null || value === undefined || value === "") {
    return (
      <span className="font-mono text-[11px] text-slate-600 select-none">
        —
      </span>
    );
  }

  const stringVal =
    typeof value === "object" ? JSON.stringify(value) : String(value);

  // If search query is present and matches, highlight substring
  if (
    searchHighlight &&
    searchHighlight.trim().length > 0 &&
    stringVal.toLowerCase().includes(searchHighlight.toLowerCase())
  ) {
    const query = searchHighlight.toLowerCase();
    const idx = stringVal.toLowerCase().indexOf(query);
    const before = stringVal.slice(0, idx);
    const match = stringVal.slice(idx, idx + query.length);
    const after = stringVal.slice(idx + query.length);

    return (
      <span
        title={stringVal}
        className="block max-w-[280px] truncate font-mono text-[11px] text-slate-300"
      >
        <span>{before}</span>
        <mark className="rounded-xs bg-amber-400/30 text-amber-200 px-0.5">
          {match}
        </mark>
        <span>{after}</span>
      </span>
    );
  }

  return (
    <span
      title={stringVal}
      className="block max-w-[280px] truncate font-mono text-[11px] text-slate-300"
    >
      {stringVal}
    </span>
  );
});
