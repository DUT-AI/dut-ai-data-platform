"use client";

import { useState } from "react";
import { Check, CheckCircle2, X, XCircle } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import type { WorkItem, WorkItemStatus } from "../types";
import { useTransitionMutation } from "../hooks";
import {
  getNextPossibleTransitions,
  getStatusBadgeVariant,
  getStatusLabel,
  getTransitionDetails,
} from "./status-helpers";

interface TransitionDialogProps {
  workItem: WorkItem | null;
  defaultTarget?: WorkItemStatus | null;
  onClose: () => void;
  onOpenAssign?: (workItemId: string) => void;
}

export function TransitionDialog(props: TransitionDialogProps) {
  if (!props.workItem) return null;

  return (
    <TransitionDialogContent
      key={`${props.workItem.id}_${props.defaultTarget || "none"}`}
      {...props}
      workItem={props.workItem}
    />
  );
}

function TransitionDialogContent({
  workItem,
  defaultTarget,
  onClose,
  onOpenAssign,
}: TransitionDialogProps & { workItem: WorkItem }) {
  const [selectedTarget, setSelectedTarget] = useState<WorkItemStatus | null>(
    defaultTarget || null
  );
  const [comment, setComment] = useState("");
  const transitionMutation = useTransitionMutation();

  const possibleTransitions = getNextPossibleTransitions(workItem.status);
  const selectedDetails = selectedTarget
    ? getTransitionDetails(workItem.status, selectedTarget)
    : null;

  const isApproving = selectedTarget === "APPROVED";
  const isRejecting = selectedTarget === "REJECTED";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget) return;

    try {
      await transitionMutation.mutateAsync({
        workItemId: workItem.id,
        data: {
          target_status: selectedTarget,
          comment: comment.trim() || undefined,
        },
      });
      onClose();
    } catch {
      // Error handled by react-query / axios
    }
  };

  const getDialogTitle = () => {
    if (isApproving) return "Duyệt đạt lô công việc (Approve)";
    if (isRejecting) return "Yêu cầu sửa lại nhãn (Reject)";
    return "Chuyển trạng thái công việc";
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transition-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            {isApproving && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            {isRejecting && <XCircle className="h-5 w-5 text-rose-600" />}
            <h2 id="transition-dialog-title" className="text-base font-semibold text-slate-900">
              {getDialogTitle()}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <span className="text-xs font-medium text-slate-500">Trạng thái hiện tại:</span>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(workItem.status)}>
                {getStatusLabel(workItem.status)}
              </Badge>
              {workItem.status === "CREATED" && onOpenAssign && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAssign(workItem.id);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  👉 Chuyển sang &apos;Đã giao&apos; bằng cách Giao việc
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">
              {isApproving || isRejecting ? "Trạng thái chuyển tiếp đã chọn:" : "Chọn trạng thái kế tiếp:"}
            </label>
            {possibleTransitions.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                Công việc này đã ở trạng thái kết thúc (không thể chuyển tiếp).
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {possibleTransitions.map((target) => {
                  const isSelected = selectedTarget === target;
                  const details = getTransitionDetails(workItem.status, target);
                  return (
                    <button
                      key={target}
                      type="button"
                      onClick={() => setSelectedTarget(target)}
                      className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-xs transition-colors ${
                        isSelected
                          ? target === "APPROVED"
                            ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 shadow-xs"
                            : target === "REJECTED"
                              ? "border-rose-600 bg-rose-50/50 text-rose-900 shadow-xs"
                              : "border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span>{details.actionName}</span>
                          {details.isRollback && (
                            <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800">
                              Hoàn tác
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">{details.hint}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="transition-comment"
              className="text-xs font-semibold text-slate-700"
            >
              {isApproving
                ? "Nhận xét / Lời nhắn cho Annotator (Tùy chọn):"
                : isRejecting
                  ? "Lý do từ chối / Hướng dẫn sửa nhãn (Lưu vào nhật ký để người làm biết sửa):"
                  : selectedDetails?.isRollback
                    ? "Lý do hoàn tác / Chuyển bước (Lưu vào nhật ký audit):"
                    : "Nhận xét / Phản hồi (Tùy chọn):"}
            </label>
            <textarea
              id="transition-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                isApproving
                  ? "Ví dụ: Nhãn vẽ chuẩn, đầy đủ thuộc tính..."
                  : isRejecting
                    ? "Ví dụ: Bounding box xe ở góc phải bị sót, nhãn người bị lệch khung..."
                    : selectedDetails?.isRollback
                      ? "Ví dụ: Bấm nhầm, giao nhầm người, rút lại bài để bổ sung nhãn..."
                      : "Nhập lý do duyệt, từ chối hoặc hướng dẫn sửa đổi..."
              }
              className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {transitionMutation.isError && (
            <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">
              {(transitionMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
                "Có lỗi xảy ra khi chuyển trạng thái."}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Hủy bỏ
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={!selectedTarget || transitionMutation.isPending}
              className={
                isApproving
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  : isRejecting
                    ? "bg-rose-600 hover:bg-rose-700 text-white font-medium"
                    : ""
              }
            >
              {transitionMutation.isPending
                ? "Đang xử lý..."
                : isApproving
                  ? "Xác nhận Duyệt đạt"
                  : isRejecting
                    ? "Xác nhận Yêu cầu sửa"
                    : "Xác nhận chuyển"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

