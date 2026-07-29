"use client";

import { useMemo } from "react";
import { Badge, Card } from "@/components/ui";
import { AnnotationRevision } from "../types/annotation";

interface RevisionDiffViewProps {
  currentRevision: AnnotationRevision;
  previousRevision?: AnnotationRevision;
}

export function RevisionDiffView({
  currentRevision,
  previousRevision,
}: RevisionDiffViewProps) {
  const diffSummary = useMemo(() => {
    if (!previousRevision) {
      return {
        added: currentRevision.results.length,
        removed: 0,
        unchanged: 0,
      };
    }

    const prevCategoryMap: Record<string, number> = {};
    previousRevision.results.forEach((r) => {
      const cat = r.category_id || "unlabeled";
      prevCategoryMap[cat] = (prevCategoryMap[cat] || 0) + 1;
    });

    const currCategoryMap: Record<string, number> = {};
    currentRevision.results.forEach((r) => {
      const cat = r.category_id || "unlabeled";
      currCategoryMap[cat] = (currCategoryMap[cat] || 0) + 1;
    });

    let added = 0;
    let removed = 0;

    const allCats = new Set([
      ...Object.keys(prevCategoryMap),
      ...Object.keys(currCategoryMap),
    ]);

    allCats.forEach((cat) => {
      const prevCount = prevCategoryMap[cat] || 0;
      const currCount = currCategoryMap[cat] || 0;
      if (currCount > prevCount) {
        added += currCount - prevCount;
      } else if (prevCount > currCount) {
        removed += prevCount - currCount;
      }
    });

    return {
      added,
      removed,
      unchanged: Math.min(
        previousRevision.results.length,
        currentRevision.results.length
      ),
    };
  }, [currentRevision, previousRevision]);

  return (
    <Card className="p-3 bg-slate-900 border-slate-800 space-y-2 text-xs">
      <div className="flex items-center justify-between font-semibold text-slate-300">
        <span>So sánh Revision (Diff)</span>
        {previousRevision ? (
          <span className="font-mono text-[10px] text-slate-400">
            r{previousRevision.revision_number} → r
            {currentRevision.revision_number}
          </span>
        ) : (
          <span className="font-mono text-[10px] text-slate-400">
            Phiên bản đầu tiên
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Badge variant="success" className="text-[10px]">
          +{diffSummary.added} Thêm mới
        </Badge>
        <Badge variant="destructive" className="text-[10px]">
          -{diffSummary.removed} Đã xóa
        </Badge>
        <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
          {diffSummary.unchanged} Không đổi
        </Badge>
      </div>
    </Card>
  );
}
