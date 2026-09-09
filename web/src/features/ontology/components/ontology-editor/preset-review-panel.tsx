"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button, Input } from "@/components/ui";
import type { OntologyPreset } from "../../helpers/ontology-presets";

interface PresetReviewPanelProps {
  preset: OntologyPreset;
  pending: boolean;
  onCancel: () => void;
  onApply: (preset: OntologyPreset) => Promise<void>;
}

export function PresetReviewPanel({
  preset,
  pending,
  onCancel,
  onApply,
}: PresetReviewPanelProps) {
  const [draft, setDraft] = useState<OntologyPreset>(() =>
    structuredClone(preset)
  );

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900 dark:bg-blue-950/30">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-blue-600 p-2 text-white">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">
            Xem lại bản mẫu: {draft.name}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
            Dữ liệu mới chỉ nằm trên FE. Bạn có thể sửa tên trước khi gửi xuống
            Backend để tạo node và kết nối.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded p-1 text-slate-500 hover:bg-blue-100 dark:hover:bg-blue-900"
          aria-label="Đóng bản mẫu"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <label className="grid gap-1.5 text-xs font-medium">
          Tên Input
          <Input
            name="preset-input-name"
            autoComplete="off"
            value={draft.input.name}
            onChange={(event) =>
              setDraft({
                ...draft,
                input: { ...draft.input, name: event.target.value },
              })
            }
          />
          <span className="font-normal leading-5 text-slate-500">
            {draft.inputFormat}
          </span>
        </label>
        <label className="grid gap-1.5 text-xs font-medium">
          Tên Output
          <Input
            name="preset-output-name"
            autoComplete="off"
            value={draft.output.name}
            onChange={(event) =>
              setDraft({
                ...draft,
                output: { ...draft.output, name: event.target.value },
              })
            }
          />
          <span className="font-normal leading-5 text-slate-500">
            {draft.outputFormat}
          </span>
        </label>
        <fieldset className="grid gap-2">
          <legend className="text-xs font-medium">Category</legend>
          {draft.categories.length === 0 ? (
            <p className="text-xs leading-5 text-slate-500">
              Bài toán này không cần Category.
            </p>
          ) : (
            draft.categories.map((category, index) => (
              <div
                key={`${category.key}-${index}`}
                className="grid grid-cols-2 gap-2"
              >
                <Input
                  name={`preset-category-${index}-name`}
                  autoComplete="off"
                  aria-label={`Tên Category ${index + 1}`}
                  value={category.name}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      categories: draft.categories.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, name: event.target.value }
                          : item
                      ),
                    })
                  }
                />
                <Input
                  name={`preset-category-${index}-key`}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={`Key Category ${index + 1}`}
                  value={category.key}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      categories: draft.categories.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              key: event.target.value
                                .toLowerCase()
                                .replace(/\s+/g, "_"),
                            }
                          : item
                      ),
                    })
                  }
                />
              </div>
            ))
          )}
        </fieldset>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button
          type="button"
          isLoading={pending}
          disabled={!draft.input.name.trim() || !draft.output.name.trim()}
          onClick={() => onApply(draft)}
        >
          Tạo và nối vào Draft
        </Button>
      </div>
    </section>
  );
}
