"use client";

import { useMemo } from "react";
import { Calendar, History, UserPlus, X } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { ProjectMember } from "@/features/projects";
import { useWorkItemHistoryQuery } from "../hooks";
import { getStatusBadgeVariant, getStatusLabel } from "./status-helpers";

interface WorkItemHistoryModalProps {
  workItemId: string | null;
  members?: ProjectMember[];
  onClose: () => void;
}

export function WorkItemHistoryModal({
  workItemId,
  members = [],
  onClose,
}: WorkItemHistoryModalProps) {
  const { data: history = [], isLoading } = useWorkItemHistoryQuery(workItemId);

  // Filter out granular asset-level review comments; keep only batch state transitions in audit trail
  const stateTransitions = useMemo(() => {
    return history.filter(
      (record) =>
        record.from_state !== record.to_state &&
        record.metadata?.type !== "REVIEW_COMMENT"
    );
  }, [history]);

  const memberMap = useMemo(() => {
    const map = new Map<string, ProjectMember>();
    for (const m of members) {
      map.set(String(m.user_id), m);
    }
    return map;
  }, [members]);

  if (!workItemId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            <h2 id="history-modal-title" className="text-lg font-semibold text-slate-900">
              Nhật ký xử lý (Audit Trail)
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Đóng nhật ký"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 text-xs font-medium text-slate-500">
            Mã công việc: <span className="font-mono text-slate-800">{workItemId}</span>
          </div>

          {isLoading ? (
            <div className="space-y-3 py-4">
              <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : stateTransitions.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Chưa có lịch sử chuyển đổi trạng thái nào được ghi nhận.
            </div>
          ) : (
            <ol className="relative border-l border-slate-200 ml-3 space-y-6">
              {stateTransitions.map((record, index) => {
                const actor = memberMap.get(String(record.changed_by));
                const meta = (record.metadata || {}) as Record<string, unknown>;
                const assigneeId = meta.assignee_id ? String(meta.assignee_id) : undefined;
                const assignee = assigneeId ? memberMap.get(assigneeId) : undefined;
                const dueDate = meta.due_date as string | undefined;

                return (
                  <li key={record.id || index} className="ml-6">
                    <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white bg-blue-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    </span>

                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                      <Badge variant={getStatusBadgeVariant(record.from_state)}>
                        {getStatusLabel(record.from_state)}
                      </Badge>
                      <span className="text-slate-400">→</span>
                      <Badge variant={getStatusBadgeVariant(record.to_state)}>
                        {getStatusLabel(record.to_state)}
                      </Badge>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span>Người thực hiện:</span>
                      {actor ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-800">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700 uppercase">
                            {(actor.user_name || actor.user_email || "U").charAt(0)}
                          </span>
                          <span>{actor.user_name || actor.user_email}</span>
                          <span className="text-[10px] text-slate-400">({actor.role})</span>
                        </span>
                      ) : (
                        <span className="font-mono font-medium text-slate-700">
                          User #{record.changed_by}
                        </span>
                      )}
                      <span>•</span>
                      <span>
                        {record.changed_at
                          ? new Date(record.changed_at).toLocaleString("vi-VN")
                          : "Không rõ thời gian"}
                      </span>
                    </div>

                    {/* Assignee display */}
                    {(assignee || assigneeId) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-2.5 py-1.5 text-xs">
                        <span className="flex items-center gap-1 font-medium text-blue-900">
                          <UserPlus className="h-3.5 w-3.5 text-blue-600" />
                          Người nhận việc:
                        </span>
                        {assignee ? (
                          <div className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-200 text-[10px] font-bold text-blue-800 uppercase">
                              {(assignee.user_name || assignee.user_email || "U").charAt(0)}
                            </span>
                            <span>{assignee.user_name || assignee.user_email}</span>
                            <Badge variant="outline" className="text-[10px] py-0 font-normal">
                              {assignee.role}
                            </Badge>
                          </div>
                        ) : (
                          <span className="font-mono text-slate-700">User #{assigneeId}</span>
                        )}
                      </div>
                    )}

                    {/* Due Date display */}
                    {dueDate && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">Hạn chót:</span>
                        <span className="semibold text-blue-700">
                          {new Date(dueDate).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    )}

                    {record.comment && (
                      <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-700">
                        <span className="font-semibold text-slate-900">Ghi chú:</span>{" "}
                        {record.comment}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 px-6 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}

