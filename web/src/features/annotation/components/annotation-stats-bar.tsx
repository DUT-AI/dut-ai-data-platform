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
    <Card className="flex flex-col justify-between gap-3 border-slate-800 bg-slate-900 p-3 text-slate-200 md:flex-row md:items-center">
      <div className="flex items-center gap-3">
        <div className="bg-primary-500/10 text-primary-400 rounded-lg p-2 text-sm font-bold">
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

      <div className="flex w-full items-center gap-3 md:w-64">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div
            style={{ width: `${percentage}%` }}
            className="bg-primary-500 h-full rounded-full transition-all duration-500"
          />
        </div>
        <span className="text-primary-400 min-w-[36px] text-right font-mono text-xs font-bold">
          {percentage}%
        </span>
      </div>
    </Card>
  );
}
