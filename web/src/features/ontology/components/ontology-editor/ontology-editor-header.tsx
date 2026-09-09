"use client";

import { ArrowLeft, Braces, CheckCircle2, CopyPlus, Pencil, Save, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import type { OntologyVersion, VersionStatus } from "../../types";

interface OntologyEditorHeaderProps {
  name: string;
  description: string | null;
  versions: OntologyVersion[];
  selectedVersionId: string;
  status: VersionStatus;
  hasChanges: boolean;
  busy: boolean;
  onBack: () => void;
  onSelectVersion: (versionId: string) => void;
  onCreateDraft: () => void;
  onRenameVersion: () => void;
  onDeleteDraft: () => void;
  canDeleteDraft: boolean;
  onRenameOntology: () => void;
  onDeleteOntology: () => void;
  onSave: () => void;
  onValidate: () => void;
  onPublish: () => void;
  onExport: () => void;
}

export function OntologyEditorHeader({
  name,
  description,
  versions,
  selectedVersionId,
  status,
  hasChanges,
  busy,
  onBack,
  onSelectVersion,
  onCreateDraft,
  onRenameVersion,
  onDeleteDraft,
  canDeleteDraft,
  onRenameOntology,
  onDeleteOntology,
  onSave,
  onValidate,
  onPublish,
  onExport,
}: OntologyEditorHeaderProps) {
  const isDraft = status === "draft";
  const selectedVersion = versions.find(
    (version) => version.id === selectedVersionId
  );

  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onBack}
            aria-label="Quay lại danh sách Ontology"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-pretty text-xl font-semibold text-slate-950 dark:text-white">
              {name}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {description || "Chưa có mô tả cho Ontology này."}
            </p>
          </div>
        </div>

        <div className="grid shrink-0 gap-2 sm:grid-cols-[18rem_6.5rem_auto] sm:items-end">
          <label className="grid min-w-0 gap-1 text-xs font-medium text-slate-500">
            Version đang xem
            <select
              value={selectedVersionId}
              onChange={(event) => onSelectVersion(event.target.value)}
              aria-label="Version Ontology đang xem"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.version_no} · {version.name} · {version.status}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-1">
            <span className="text-xs font-medium text-slate-500">
              Trạng thái
            </span>
            <span
              className={`inline-flex h-9 min-w-[6.5rem] items-center justify-center rounded-md px-3 text-xs font-semibold uppercase tracking-wide ${
                isDraft
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
              }`}
            >
              {isDraft ? "Draft" : "Published"}
            </span>
          </div>
          <div className="grid gap-1">
            <span className="text-xs font-medium text-slate-500">Cấu trúc</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={!selectedVersionId || busy}
              className="h-9 whitespace-nowrap"
              title={
                isDraft
                  ? "Xuất schema Draft để chia sẻ và thảo luận"
                  : "Xuất schema của Published Version"
              }
            >
              <Braces className="mr-1.5 size-4" aria-hidden="true" />
              Xuất schema
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex min-h-9 items-center gap-2 overflow-x-auto border-t border-slate-200 pt-3 dark:border-slate-800">
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onRenameOntology}
          >
            <Pencil className="mr-1 size-3.5" aria-hidden="true" />
            Sửa thông tin
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onDeleteOntology}
          >
            <Trash2
              className="mr-1 size-3.5 text-rose-600"
              aria-hidden="true"
            />
            Xóa Ontology
          </Button>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span
            className={`whitespace-nowrap text-xs font-medium text-amber-700 dark:text-amber-300 ${
              hasChanges && isDraft ? "visible" : "invisible"
            }`}
            aria-live="polite"
          >
            Chưa lưu kết nối
          </span>
          {!isDraft && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCreateDraft}
              disabled={busy}
            >
              <CopyPlus className="mr-1.5 size-4" aria-hidden="true" />
              Tạo Draft mới
            </Button>
          )}
          {isDraft && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRenameVersion}
                disabled={busy}
              >
                <Pencil className="mr-1.5 size-4" aria-hidden="true" />
                Đổi tên Draft
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDeleteDraft}
                disabled={busy || !canDeleteDraft}
              >
                <Trash2
                  className="mr-1.5 size-4 text-rose-600"
                  aria-hidden="true"
                />
                Xóa Draft
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onValidate}
                disabled={busy}
              >
                <CheckCircle2 className="mr-1.5 size-4" aria-hidden="true" />
                Kiểm tra
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSave}
                disabled={busy || !hasChanges}
              >
                <Save className="mr-1.5 size-4" aria-hidden="true" />
                Lưu kết nối
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onPublish}
                disabled={busy}
              >
                <Send className="mr-1.5 size-4" aria-hidden="true" />
                Publish
              </Button>
            </>
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Đang xem {selectedVersion?.name ?? "version"}, trạng thái {status}.
      </p>
    </header>
  );
}
