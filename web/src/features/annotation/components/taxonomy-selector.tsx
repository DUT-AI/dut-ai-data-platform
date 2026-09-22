"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Tag } from "lucide-react";

export interface TaxonomyItem {
  id: string;
  label: string;
  color?: string;
  children?: TaxonomyItem[];
}

interface TaxonomySelectorProps {
  items: TaxonomyItem[];
  selectedPath: string[]; // e.g. ["Animal", "Mammal", "Dog"]
  onSelect: (path: string[]) => void;
  placeholder?: string;
  readOnly?: boolean;
}

/**
 * Hierarchical Taxonomy Selector component
 * Adapted from Label Studio components/NewTaxonomy/NewTaxonomy.tsx
 */
function flattenTaxonomyItems(
  nodes: TaxonomyItem[],
  currentPath: string[] = []
): Array<{ path: string[]; item: TaxonomyItem }> {
  let result: Array<{ path: string[]; item: TaxonomyItem }> = [];
  for (const node of nodes) {
    const nextPath = [...currentPath, node.label];
    result.push({ path: nextPath, item: node });
    if (node.children && node.children.length > 0) {
      result = result.concat(flattenTaxonomyItems(node.children, nextPath));
    }
  }
  return result;
}

export function TaxonomySelector({
  items,
  selectedPath = [],
  placeholder = "Chọn nhãn phân cấp...",
  readOnly = false,
  onSelect,
}: TaxonomySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allNodes = useMemo(() => flattenTaxonomyItems(items), [items]);

  const filteredNodes = useMemo(() => {
    if (!search.trim()) return allNodes;
    const q = search.toLowerCase();
    return allNodes.filter(
      (n) =>
        n.item.label.toLowerCase().includes(q) ||
        n.path.some((p) => p.toLowerCase().includes(q))
    );
  }, [allNodes, search]);

  const selectedDisplay =
    selectedPath.length > 0 ? selectedPath.join(" > ") : placeholder;

  return (
    <div className="relative inline-block w-full max-w-sm">
      <button
        type="button"
        disabled={readOnly}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 shadow-sm hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className={`flex min-w-0 items-center gap-1.5 ${selectedPath.length === 0 ? "text-slate-500" : "font-medium"}`}
        >
          <Tag className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{selectedDisplay}</span>
        </span>
        {isOpen ? (
          <ChevronUp
            className="ml-2 size-3.5 shrink-0 text-slate-500"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="ml-2 size-3.5 shrink-0 text-slate-500"
            aria-hidden="true"
          />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-hidden rounded-md border border-slate-800 bg-slate-950 p-2 shadow-xl">
            <input
              type="text"
              placeholder="Tìm kiếm nhãn trong cây..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              autoFocus
            />

            <div className="max-h-44 space-y-1 overflow-y-auto">
              {filteredNodes.length === 0 ? (
                <div className="py-2 text-center text-xs text-slate-500">
                  Không tìm thấy nhãn
                </div>
              ) : (
                filteredNodes.map(({ path, item }) => {
                  const isSelected =
                    selectedPath.join(" > ") === path.join(" > ");
                  const depth = path.length - 1;

                  return (
                    <button
                      key={path.join("/")}
                      type="button"
                      onClick={() => {
                        onSelect(path);
                        setIsOpen(false);
                      }}
                      style={{ paddingLeft: `${depth * 12 + 8}px` }}
                      className={`flex w-full items-center space-x-1.5 rounded py-1 pr-2 text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                      }`}
                    >
                      {item.color && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      <span className="truncate">{path.join(" / ")}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
