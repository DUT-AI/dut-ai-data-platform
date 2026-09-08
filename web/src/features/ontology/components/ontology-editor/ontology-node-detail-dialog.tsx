"use client";

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui";
import type { Category, OntologyInput, OntologyOutput, OntologyVersion } from "../../types";

export type OntologyNodeDetails =
  | { kind: "input"; node: OntologyInput; versions: OntologyVersion[] }
  | { kind: "output"; node: OntologyOutput; versions: OntologyVersion[] }
  | { kind: "category"; node: Category; versions: OntologyVersion[] };

interface OntologyNodeDetailDialogProps {
  details: OntologyNodeDetails | null;
  onClose: () => void;
}

const nodeKindLabel = {
  input: "Input",
  output: "Output",
  category: "Category",
};

const versionStatusLabel = (version: OntologyVersion): string =>
  version.status === "published" ? "Published" : "Draft";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40 sm:grid-cols-[140px_1fr]">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="break-words text-sm text-slate-900 dark:text-slate-100">
        {value}
      </dd>
    </div>
  );
}

export function OntologyNodeDetailDialog({
  details,
  onClose,
}: OntologyNodeDetailDialogProps) {
  const node = details?.node;
  const schema =
    details?.kind === "input"
      ? details.node.input_schema
      : details?.kind === "output"
        ? details.node.value_schema ?? details.node.definition?.default_schema
        : details?.kind === "category"
          ? {
              key: details.node.key,
              name: details.node.name,
              color: details.node.color,
            }
          : null;

  return (
    <Dialog open={Boolean(details)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl" onClose={onClose}>
        {details && node && (
          <>
            <DialogHeader>
              <DialogTitle>Chi tiết {nodeKindLabel[details.kind]}</DialogTitle>
              <DialogDescription>
                Thông tin đang lưu của node trong Ontology.
              </DialogDescription>
            </DialogHeader>

            <div className="mb-4 flex flex-wrap gap-2">
              {details.versions.length > 0 ? (
                [...details.versions]
                  .sort((left, right) => right.version_no - left.version_no)
                  .map((version) => (
                    <span
                      key={version.id}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold tabular-nums text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    >
                      v{version.version_no} {versionStatusLabel(version)}
                    </span>
                  ))
              ) : (
                <span className="text-xs text-slate-500">
                  Chưa thuộc Version nào.
                </span>
              )}
            </div>

            <dl className="grid gap-2">
              <DetailRow label="Tên" value={node.name} />
              <DetailRow label="ID" value={node.id} />
              <DetailRow label="Mô tả" value={node.description || "Chưa có mô tả"} />
              <DetailRow label="Trạng thái" value={node.locked ? "Đã khóa" : "Có thể chỉnh sửa"} />

              {details.kind === "input" && (
                <>
                  <DetailRow label="Loại Input" value={details.node.definition?.name ?? details.node.input_schema.type} />
                  <DetailRow label="Scope" value={details.node.scope === "ONE_ITEM" ? "1 Asset = 1 Item" : "1 Asset = N Items"} />
                  <DetailRow label="Định dạng" value={details.node.input_schema.allowed_extensions.map((extension) => `.${extension}`).join(", ") || "Không giới hạn"} />
                </>
              )}

              {details.kind === "output" && (
                <>
                  <DetailRow label="Loại Output" value={details.node.definition?.name ?? "Output"} />
                  <DetailRow label="Số kết quả" value={details.node.multiple ? "Nhiều kết quả" : "Một kết quả"} />
                  <DetailRow label="Bắt buộc" value={details.node.required ? "Có" : "Không"} />
                  <DetailRow label="Category" value={details.node.definition?.supports_categories ? "Có sử dụng Category" : "Không sử dụng Category"} />
                </>
              )}

              {details.kind === "category" && (
                <>
                  <DetailRow label="Key" value={details.node.key} />
                  <DetailRow label="Màu" value={details.node.color ?? "Chưa đặt màu"} />
                </>
              )}
            </dl>

            <details className="mt-4 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
              <summary className="cursor-pointer font-medium">
                Xem schema JSON
              </summary>
              <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                {JSON.stringify(schema, null, 2)}
              </pre>
            </details>

            <DialogFooter>
              <Button type="button" onClick={onClose}>
                Đóng
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
