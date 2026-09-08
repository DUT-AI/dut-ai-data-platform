"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from "@/components/ui";
import { getOntologyApiError } from "../../helpers/ontology-error";
import { ontologyCreateSchema, type OntologyCreatePayload } from "../../types";

interface CreateOntologyDialogProps {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: OntologyCreatePayload) => Promise<void>;
}

export function CreateOntologyDialog({
  open,
  pending,
  onClose,
  onSubmit,
}: CreateOntologyDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = (): void => {
    setName("");
    setDescription("");
    setError(null);
    onClose();
  };

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const parsed = ontologyCreateSchema.safeParse({
      name,
      description: description || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ.");
      return;
    }
    try {
      await onSubmit(parsed.data);
      close();
    } catch (submitError) {
      setError(getOntologyApiError(submitError));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-w-md" onClose={close}>
        <DialogHeader>
          <DialogTitle>Tạo Ontology</DialogTitle>
          <DialogDescription>
            Hệ thống tạo sẵn Draft v1 để bạn khai báo Input, Output và Category.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Tên Ontology
            <Input
              name="ontology-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              placeholder="Phát hiện phương tiện"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Mô tả mục đích
            <textarea
              name="ontology-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              autoComplete="off"
              placeholder="Dùng để định nghĩa dữ liệu đầu vào và nhãn đầu ra…"
              className="resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          {error && (
            <p className="text-sm text-rose-600" aria-live="polite">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Hủy
            </Button>
            <Button type="submit" isLoading={pending}>
              Tạo và mở Draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
