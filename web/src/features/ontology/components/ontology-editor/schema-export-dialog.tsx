"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui";
import type { ExportedOntologySchema } from "../../types";

interface SchemaExportDialogProps {
  schema: ExportedOntologySchema | null;
  open: boolean;
  onClose: () => void;
}

export function SchemaExportDialog({
  schema,
  open,
  onClose,
}: SchemaExportDialogProps) {
  const [copied, setCopied] = useState(false);
  const content = schema ? JSON.stringify(schema, null, 2) : "";

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const download = (): void => {
    if (!schema) return;
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ontology-v${schema.version_no}-schema.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Schema của Ontology Version</DialogTitle>
          <DialogDescription>
            Object này mô tả chính xác Input, Output và Category mà Dataset hoặc
            Annotation có thể đọc.
          </DialogDescription>
        </DialogHeader>
        <pre className="max-h-[58vh] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
          {content || "Đang tải schema…"}
        </pre>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={copy}
            disabled={!schema}
          >
            {copied ? (
              <Check className="mr-2 size-4" aria-hidden="true" />
            ) : (
              <Copy className="mr-2 size-4" aria-hidden="true" />
            )}
            {copied ? "Đã sao chép" : "Sao chép JSON"}
          </Button>
          <Button type="button" onClick={download} disabled={!schema}>
            <Download className="mr-2 size-4" aria-hidden="true" />
            Tải file JSON
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
