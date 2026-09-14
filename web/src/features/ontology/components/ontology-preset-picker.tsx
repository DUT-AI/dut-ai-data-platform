"use client";

import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import {
  ONTOLOGY_PRESETS,
  type OntologyPreset,
} from "../helpers/ontology-presets";

interface OntologyPresetPickerProps {
  disabled: boolean;
  disabledReason: string;
  onApply: (preset: OntologyPreset) => void;
}

export function OntologyPresetPicker({
  disabled,
  disabledReason,
  onApply,
}: OntologyPresetPickerProps) {
  const [open, setOpen] = useState(false);

  const applyPreset = (preset: OntologyPreset) => {
    onApply(preset);
    setOpen(false);
  };

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50/80 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-blue-900 dark:bg-blue-950/30">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-blue-600 p-2 text-white">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950 dark:text-white">
              Bản mẫu đề xuất
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
              Xem các bài toán phổ biến và điền sẵn toàn bộ Input, Output ngay
              trên FE.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 justify-between gap-3 bg-white sm:justify-center dark:bg-slate-950"
          onClick={() => setOpen(true)}
        >
          Chọn bản mẫu
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen} className="w-[95vw] max-w-4xl">
        <DialogContent
          onClose={() => setOpen(false)}
          className="max-h-[88vh] p-0"
        >
          <DialogHeader className="border-b border-slate-200 px-6 py-5 pr-14 dark:border-slate-800">
            <DialogTitle>Chọn bản mẫu Ontology</DialogTitle>
            <DialogDescription className="max-w-2xl leading-6">
              Mỗi mẫu mô tả ngắn định dạng Input và Output. Nhấn “Áp dụng mẫu”
              để FE điền cả hai form; bạn vẫn có thể sửa mọi giá trị trước khi
              lưu sang BE.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-6">
            {ONTOLOGY_PRESETS.map((preset) => (
              <article
                key={preset.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                  {preset.name}
                </h3>
                <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {preset.description}
                </p>
                <dl className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900">
                  <div className="grid grid-cols-[52px_1fr] gap-2">
                    <dt className="font-semibold text-slate-500">Input</dt>
                    <dd className="break-words text-slate-700 dark:text-slate-200">
                      {preset.inputFormat}
                    </dd>
                  </div>
                  <div className="grid grid-cols-[52px_1fr] gap-2">
                    <dt className="font-semibold text-slate-500">Output</dt>
                    <dd className="break-words text-slate-700 dark:text-slate-200">
                      {preset.outputFormat}
                    </dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => applyPreset(preset)}
                  disabled={disabled}
                >
                  Áp dụng mẫu
                </Button>
              </article>
            ))}
          </div>

          {disabled && (
            <p className="border-t border-amber-200 bg-amber-50 px-6 py-3 text-xs leading-5 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              {disabledReason}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
