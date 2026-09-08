"use client";

import { cn } from "@/lib/utils";

interface NodeVersionSummaryProps {
  included: boolean;
  detail: string;
}

export function NodeVersionSummary({
  included,
  detail,
}: NodeVersionSummaryProps) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2",
        included
          ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30"
          : "border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/30"
      )}
    >
      <p
        className={cn(
          "text-[11px] leading-4",
          included
            ? "font-medium text-emerald-700 dark:text-emerald-300"
            : "text-slate-600 dark:text-slate-300"
        )}
      >
        {detail}
      </p>
    </div>
  );
}
