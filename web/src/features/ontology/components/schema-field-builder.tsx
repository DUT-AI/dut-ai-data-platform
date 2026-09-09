"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import type { SchemaField } from "../types";
import { schemaFieldsToJsonObject, jsonObjectToSchemaFields } from "../api";

export const emptySchemaField = (): SchemaField => ({
  id: crypto.randomUUID(),
  name: "",
  type: "string",
  required: false,
});

/**
 * Re-export mappers under the old names so that existing component imports
 * continue to work without a mass rename across every consumer.
 */
export const fieldsToObjectSchema = schemaFieldsToJsonObject;
export const objectSchemaToFields = jsonObjectToSchemaFields;

interface SchemaFieldBuilderProps {
  fields: SchemaField[];
  onChange: (fields: SchemaField[]) => void;
  error?: string;
}

export function SchemaFieldBuilder({
  fields,
  onChange,
  error,
}: SchemaFieldBuilderProps) {
  const update = (id: string, patch: Partial<SchemaField>): void => {
    onChange(
      fields.map((field) => (field.id === id ? { ...field, ...patch } : field))
    );
  };

  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <legend className="text-sm font-semibold">Cấu trúc một Item</legend>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Khai báo các trường của một bản ghi nằm bên trong Asset.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...fields, emptySchemaField()])}
        >
          <Plus className="mr-1 size-4" aria-hidden="true" /> Thêm trường
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900">
          Chưa có trường. Thêm ít nhất một trường để mô tả Item.
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-2 rounded-lg bg-slate-50 p-2 sm:grid-cols-[1fr_130px_auto_auto] sm:items-center dark:bg-slate-900"
            >
              <Input
                name={`schema-field-${index}-name`}
                autoComplete="off"
                spellCheck={false}
                aria-label={`Tên trường ${index + 1}`}
                value={field.name}
                placeholder="record_id"
                onChange={(event) =>
                  update(field.id, { name: event.target.value })
                }
              />
              <select
                name={`schema-field-${index}-type`}
                aria-label={`Kiểu trường ${index + 1}`}
                value={field.type}
                onChange={(event) =>
                  update(field.id, {
                    type: event.target.value as SchemaField["type"],
                  })
                }
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="string">Text</option>
                <option value="number">Number</option>
                <option value="integer">Integer</option>
                <option value="boolean">Boolean</option>
              </select>
              <label className="flex min-h-10 items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(event) =>
                    update(field.id, { required: event.target.checked })
                  }
                />
                Bắt buộc
              </label>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Xóa trường ${index + 1}`}
                onClick={() =>
                  onChange(fields.filter((item) => item.id !== field.id))
                }
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </fieldset>
  );
}
