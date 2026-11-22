"use client";

import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Clock,
  FileText,
  GitCompare,
  ListFilter,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge, Button, Notice } from "@/components/ui";
import type { SnapshotResponse, SnapshotStatus } from "../types";

interface SnapshotCardProps {
  snapshot: SnapshotResponse;
  isOwner?: boolean;
  onViewManifest: (snapshot: SnapshotResponse) => void;
  onViewItems: (snapshot: SnapshotResponse) => void;
  onManageTags: (snapshot: SnapshotResponse) => void;
  onCompare: (snapshot: SnapshotResponse) => void;
  onCancel: (snapshot: SnapshotResponse) => void;
  onArchive: (snapshot: SnapshotResponse) => void;
  onPurge: (snapshot: SnapshotResponse) => void;
}

const statusBadgeConfig: Record<
  SnapshotStatus,
  {
    label: string;
    variant: "success" | "warning" | "destructive" | "neutral" | "info";
    icon: typeof CheckCircle2;
  }
> = {
  READY: {
    label: "Sẵn sàng",
    variant: "success",
    icon: CheckCircle2,
  },
  CREATING: {
    label: "Đang tạo...",
    variant: "warning",
    icon: Clock,
  },
  ARCHIVED: {
    label: "Đã lưu trữ",
    variant: "neutral",
    icon: Archive,
  },
  FAILED: {
    label: "Thất bại",
    variant: "destructive",
    icon: XCircle,
  },
};

export function SnapshotCard({
  snapshot,
  isOwner = false,
  onViewManifest,
  onViewItems,
  onManageTags,
  onCompare,
  onCancel,
  onArchive,
  onPurge,
}: SnapshotCardProps) {
  const statusInfo = statusBadgeConfig[snapshot.status] ?? {
    label: snapshot.status,
    variant: "neutral" as const,
    icon: AlertCircle,
  };
  const StatusIcon = statusInfo.icon;

  const trainPct = Math.round((snapshot.split_ratios.train ?? 0.7) * 100);
  const valPct = Math.round((snapshot.split_ratios.validation ?? 0.15) * 100);
  const testPct = Math.round((snapshot.split_ratios.test ?? 0.15) * 100);

  const formattedDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {snapshot.version_name}
              </h3>
              <Badge variant={statusInfo.variant}>
                <StatusIcon
                  className={`mr-1 h-3.5 w-3.5 ${snapshot.status === "CREATING" ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                {statusInfo.label}
              </Badge>
              {snapshot.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800"
                >
                  <Tag className="h-3 w-3 text-sky-600" aria-hidden="true" />
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-500">
              ID: {snapshot.id}
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Tạo lúc: {formattedDate(snapshot.created_at)}
          </span>
        </div>

        {/* Failure details notice */}
        {snapshot.status === "FAILED" && (
          <Notice
            tone="danger"
            title={`Lỗi khởi tạo: ${snapshot.error_code || "UNKNOWN_ERROR"}`}
          >
            <p className="text-xs text-rose-800">
              {snapshot.error_message ||
                "Quá trình snapshot gặp lỗi không mong muốn từ hệ thống."}
            </p>
          </Notice>
        )}

        {/* Configuration summary */}
        <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs sm:grid-cols-2">
          <div>
            <span className="text-slate-500">Dataset Version:</span>{" "}
            <span className="font-mono font-medium text-slate-800">
              {snapshot.dataset_version_id}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Ontology Version:</span>{" "}
            <span className="font-mono font-medium text-slate-800">
              {snapshot.ontology_version_id}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Chính sách gán nhãn:</span>{" "}
            <span className="font-medium text-slate-800">
              {snapshot.selection_policy === "LATEST_APPROVED"
                ? "Bản duyệt mới nhất (LATEST_APPROVED)"
                : "Bản nộp mới nhất (LATEST_SUBMITTED)"}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Mẫu chưa nhãn:</span>{" "}
            <span className="font-medium text-slate-800">
              {snapshot.include_unannotated ? "Bao gồm" : "Bỏ qua"}
            </span>
          </div>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between text-slate-600">
              <span>
                Phân chia (
                {snapshot.split_strategy === "STRATIFIED"
                  ? "Phân tầng nhãn"
                  : "Ngẫu nhiên"}{" "}
                - Seed: {snapshot.split_seed ?? 42}):
              </span>
              <span className="font-semibold text-slate-800">
                Train {trainPct}% / Val {valPct}% / Test {testPct}%
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="bg-blue-600"
                style={{ width: `${trainPct}%` }}
                title={`Train: ${trainPct}%`}
              />
              <div
                className="bg-amber-500"
                style={{ width: `${valPct}%` }}
                title={`Validation: ${valPct}%`}
              />
              <div
                className="bg-emerald-500"
                style={{ width: `${testPct}%` }}
                title={`Test: ${testPct}%`}
              />
            </div>
          </div>
        </div>

        {snapshot.finalized_at && (
          <div className="text-[11px] text-slate-500">
            Hoàn tất lúc: {formattedDate(snapshot.finalized_at)}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewManifest(snapshot)}
            disabled={
              snapshot.status !== "READY" && snapshot.status !== "ARCHIVED"
            }
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Manifest
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewItems(snapshot)}
            disabled={
              snapshot.status !== "READY" && snapshot.status !== "ARCHIVED"
            }
          >
            <ListFilter className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Xem Items
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onManageTags(snapshot)}
            disabled={snapshot.status !== "READY"}
          >
            <Tag className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Tags
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onCompare(snapshot)}
            disabled={
              snapshot.status !== "READY" && snapshot.status !== "ARCHIVED"
            }
          >
            <GitCompare className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            So sánh
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {snapshot.status === "CREATING" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onCancel(snapshot)}
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Huỷ tiến trình
            </Button>
          )}

          {snapshot.status === "READY" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-600 hover:text-slate-900"
              onClick={() => onArchive(snapshot)}
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Lưu trữ
            </Button>
          )}

          {isOwner && (
            <Button
              size="sm"
              variant="ghost"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => onPurge(snapshot)}
              title="Xoá vĩnh viễn (Chỉ Project Owner)"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
