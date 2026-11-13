"use client";

import { useState } from "react";
import { AlertCircle, Check, Send, Tag, X } from "lucide-react";
import { Button } from "@/components/ui";
import { useRecordAssetReviewMutation } from "../hooks";

interface ReviewCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  workItemId: string;
  batchName?: string;
  assetId: string;
  assetFilename?: string;
  existingComment?: string;
  onSaved?: () => void;
}

const QUICK_TAGS = [
  "Bounding box chưa sát",
  "Gán sai nhãn đối tượng",
  "Bỏ sót đối tượng chưa gán",
  "Nhãn thừa / Sai vị trí",
  "Điểm polygon chưa chính xác",
];

export function ReviewCommentModal(props: ReviewCommentModalProps) {
  if (!props.isOpen) return null;

  return (
    <ReviewCommentModalContent
      key={`${props.assetId}_${props.existingComment || "empty"}`}
      {...props}
    />
  );
}

function ReviewCommentModalContent({
  onClose,
  workItemId,
  batchName,
  assetId,
  assetFilename,
  existingComment = "",
  onSaved,
}: ReviewCommentModalProps) {
  const [comment, setComment] = useState(existingComment || "");
  const [isSuccess, setIsSuccess] = useState(false);
  const recordReviewMutation = useRecordAssetReviewMutation();

  const handleAddTag = (tag: string) => {
    if (!comment) {
      setComment(tag);
    } else {
      setComment((prev) => `${prev.trimEnd()}; ${tag.toLowerCase()}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      await recordReviewMutation.mutateAsync({
        workItemId,
        data: {
          asset_id: assetId,
          status: "NEEDS_REVISION",
          comment: comment.trim(),
          asset_filename: assetFilename,
        },
      });
      setIsSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => {
        onClose();
      }, 700);
    } catch {
      // Handled by react-query
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-comment-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 id="review-comment-title" className="text-base font-semibold text-slate-900">
                Yêu cầu sửa asset: <span className="font-mono text-rose-600">{assetFilename || assetId}</span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {batchName && (
                  <span>
                    Thuộc lô: <span className="font-semibold text-slate-800">{batchName}</span>
                  </span>
                )}
                <span>•</span>
                <span className="text-rose-600 font-medium">Đánh dấu Cần sửa</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Đóng hộp thoại"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="review-comment-input" className="text-xs font-semibold text-slate-700">
                Nội dung góp ý / Lý do cần sửa cho asset này
              </label>
              <span className="text-[11px] text-slate-400">Người gán nhãn sẽ thấy nội dung này</span>
            </div>
            <textarea
              id="review-comment-input"
              rows={4}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ví dụ: Bounding box xe máy chưa sát bánh sau; nhãn ô tô bị gán nhầm sang xe tải..."
              className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-2xs"
            />
          </div>

          {/* Quick suggestion tags */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <Tag className="h-3 w-3 text-slate-400" /> Gợi ý lý do nhanh:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddTag(tag)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {isSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              <span>Đã lưu yêu cầu sửa cho asset này!</span>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs text-slate-600"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!comment.trim() || recordReviewMutation.isPending || isSuccess}
              className="h-8 gap-1.5 bg-rose-600 text-xs text-white hover:bg-rose-700 font-medium shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{recordReviewMutation.isPending ? "Đang lưu..." : "Xác nhận yêu cầu sửa"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
