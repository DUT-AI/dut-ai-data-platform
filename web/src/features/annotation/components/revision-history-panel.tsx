"use client";

import { Badge, Card } from "@/components/ui";
import { AnnotationRevision } from "../types/annotation";

interface RevisionHistoryPanelProps {
  revisions: AnnotationRevision[];
  selectedRevisionId: string;
  onSelectRevision: (revisionId: string) => void;
}

export function RevisionHistoryPanel({
  revisions,
  selectedRevisionId,
  onSelectRevision,
}: RevisionHistoryPanelProps) {
  if (revisions.length === 0) {
    return (
      <div className="p-4 text-xs text-slate-500 text-center">
        Chưa có lịch sử phiên bản sửa nhãn.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Lịch sử Revisions ({revisions.length})
        </h4>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {revisions.map((rev) => {
          const isSelected = rev.id === selectedRevisionId;

          return (
            <Card
              key={rev.id}
              onClick={() => onSelectRevision(rev.id)}
              className={`p-3 cursor-pointer transition-all border ${
                isSelected
                  ? "border-primary-500 bg-primary-500/10 dark:bg-primary-500/10"
                  : "border-slate-800 bg-slate-900 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-200">
                    r{rev.revision_number}
                  </span>
                  <Badge
                    variant={rev.source === "human" ? "default" : "secondary"}
                    className="text-[9px] py-0 px-1 font-mono uppercase"
                  >
                    {rev.source}
                  </Badge>
                </div>
                <span className="text-[10px] text-slate-500">
                  {rev.created_at
                    ? new Date(rev.created_at).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Tạo bởi: {rev.created_by.split("@")[0]}</span>
                <span className="font-medium text-slate-300">
                  {rev.results.length} nhãn
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
