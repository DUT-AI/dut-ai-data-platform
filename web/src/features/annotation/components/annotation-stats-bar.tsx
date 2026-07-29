"use client";

import { Card } from "@/components/ui";

interface AnnotationStatsBarProps {
  totalAssets: number;
  annotatedAssets: number;
}

export function AnnotationStatsBar({
  totalAssets,
  annotatedAssets,
}: AnnotationStatsBarProps) {
  const percentage =
    totalAssets > 0 ? Math.round((annotatedAssets / totalAssets) * 100) : 0;

  return (
    <Card className="p-3 bg-slate-900 border-slate-800 text-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400 font-bold text-sm">
          🏷️
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-100">
            Tiến độ Gán nhãn (Annotation Progress)
          </h4>
          <p className="text-[11px] text-slate-400">
            Đã gán nhãn {annotatedAssets} / {totalAssets} tập tin dữ liệu
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-64">
        <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            style={{ width: `${percentage}%` }}
            className="h-full bg-primary-500 rounded-full transition-all duration-500"
          />
        </div>
        <span className="font-mono text-xs font-bold text-primary-400 min-w-[36px] text-right">
          {percentage}%
        </span>
      </div>
    </Card>
  );
}
