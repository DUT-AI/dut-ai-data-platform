"use client";

import { useMemo, useState } from "react";
import { Info, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/components/ui";
import { getOntologyApiError } from "../helpers/ontology-error";
import {
  INPUT_SCOPE_HELP,
  INPUT_TYPE_HELP,
  OUTPUT_TYPE_HELP,
} from "../helpers/ontology-presets";
import type {
  Category,
  CategoryForm,
  InputDefinition,
  InputNodeForm,
  OntologyInput,
  OntologyOutput,
  OutputDefinition,
  OutputNodeForm,
} from "../types";
import {
  emptySchemaField,
  fieldsToObjectSchema,
  objectSchemaToFields,
  SchemaFieldBuilder,
} from "./schema-field-builder";

interface DialogBaseProps {
  open: boolean;
  onClose: () => void;
  pending: boolean;
  onDelete?: () => Promise<boolean>;
}

interface InputNodeDialogProps extends DialogBaseProps {
  definitions: InputDefinition[];
  initial?: OntologyInput | null;
  onSubmit: (form: InputNodeForm, definition: InputDefinition) => Promise<void>;
}

const emptyInputForm = (definition?: InputDefinition): InputNodeForm => ({
  definition_id: definition?.id ?? "",
  name: "",
  description: "",
  scope: "ONE_ITEM",
  allowed_extensions: definition?.allowed_formats.slice(0, 2) ?? [],
  fields: [],
});

const inputFormFromNode = (
  definitions: InputDefinition[],
  initial?: OntologyInput | null
): InputNodeForm =>
  initial
    ? {
        definition_id: initial.definition_id,
        name: initial.name,
        description: initial.description ?? "",
        scope: initial.scope,
        allowed_extensions: initial.input_schema.allowed_extensions,
        fields: objectSchemaToFields(initial.input_schema.item),
      }
    : emptyInputForm(definitions[0]);

export function InputNodeDialog({
  open,
  onClose,
  definitions,
  initial,
  pending,
  onSubmit,
  onDelete,
}: InputNodeDialogProps) {
  const [form, setForm] = useState<InputNodeForm>(() =>
    inputFormFromNode(definitions, initial)
  );
  const [error, setError] = useState<string | null>(null);
  const definition = definitions.find((item) => item.id === form.definition_id);

  const preview = useMemo(
    () => ({
      type: definition?.code ?? "",
      allowed_extensions: form.allowed_extensions,
      item:
        form.scope === "ONE_ITEM" ? null : fieldsToObjectSchema(form.fields),
    }),
    [definition?.code, form.allowed_extensions, form.fields, form.scope]
  );

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const parsed = (await import("../types")).inputNodeFormSchema.safeParse(
      form
    );
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Input chưa hợp lệ.");
      return;
    }
    if (!definition) {
      setError("Chọn loại Input.");
      return;
    }
    try {
      await onSubmit(parsed.data, definition);
      onClose();
    } catch (submitError) {
      setError(getOntologyApiError(submitError));
    }
  };

  const remove = async (): Promise<void> => {
    if (onDelete && (await onDelete())) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa Input" : "Tạo Input"}</DialogTitle>
          <DialogDescription>
            Khai báo Asset và cấu trúc Item theo một schema thống nhất.
          </DialogDescription>
        </DialogHeader>
        <aside className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-900 dark:border-blue-900 dark:bg-blue-950/35 dark:text-blue-100">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Cách dùng nhanh</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4">
              <li>Chọn loại dữ liệu và các đuôi file hệ thống được nhận.</li>
              <li>
                Chọn “1 Asset = 1 Item” cho một ảnh/file đơn; chọn “1 Asset = N
                Items” khi CSV, JSONL hoặc file chứa nhiều bản ghi.
              </li>
              <li>
                Tạo xong, kéo chấm bên phải Input vào toàn bộ card Output để
                thiết lập kết nối.
              </li>
            </ol>
          </div>
        </aside>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Tên Input" hint="Tên dễ hiểu hiển thị trên node.">
            <Input
              name="ontology-input-name"
              autoComplete="off"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Ảnh giao thông"
            />
          </Field>
          <Field
            label="Loại dữ liệu"
            hint={definition ? INPUT_TYPE_HELP[definition.code] : undefined}
          >
            <select
              name="ontology-input-definition"
              value={form.definition_id}
              onChange={(event) => {
                const next = definitions.find(
                  (item) => item.id === event.target.value
                );
                setForm({
                  ...form,
                  definition_id: event.target.value,
                  allowed_extensions: next?.allowed_formats.slice(0, 1) ?? [],
                });
              }}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Chọn loại Input</option>
              {definitions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Scope" hint={INPUT_SCOPE_HELP[form.scope]}>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["ONE_ITEM", "MANY_ITEMS"] as const).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      scope,
                      fields:
                        scope === "MANY_ITEMS" && form.fields.length === 0
                          ? [emptySchemaField()]
                          : form.fields,
                    })
                  }
                  className={`min-h-11 rounded-lg border px-3 text-left text-sm ${form.scope === scope ? "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100" : "border-slate-200 dark:border-slate-800"}`}
                >
                  {scope === "ONE_ITEM"
                    ? "1 Asset = 1 Item"
                    : "1 Asset = N Items"}
                </button>
              ))}
            </div>
          </Field>
          <Field
            label="Đuôi file cho phép"
            hint="Chỉ những định dạng đã chọn mới hợp lệ với Input này."
          >
            <div className="flex flex-wrap gap-2">
              {definition?.allowed_formats.map((format) => (
                <label
                  key={format}
                  className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={form.allowed_extensions.includes(format)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        allowed_extensions: event.target.checked
                          ? [...form.allowed_extensions, format]
                          : form.allowed_extensions.filter(
                              (item) => item !== format
                            ),
                      })
                    }
                  />
                  .{format}
                </label>
              ))}
            </div>
          </Field>
          {form.scope === "MANY_ITEMS" && (
            <SchemaFieldBuilder
              fields={form.fields}
              onChange={(fields) => setForm({ ...form, fields })}
            />
          )}
          <Field label="Mô tả" hint="Giải thích dữ liệu này được dùng khi nào.">
            <Textarea
              name="ontology-input-description"
              value={form.description ?? ""}
              onChange={(description) => setForm({ ...form, description })}
            />
          </Field>
          <details className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
            <summary className="cursor-pointer font-medium">
              Xem JSON input_schema
            </summary>
            <pre className="mt-3 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </details>
          {error && (
            <p className="text-sm text-rose-600" aria-live="polite">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:justify-between sm:space-x-0">
            {initial && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void remove()}
                disabled={pending}
              >
                <Trash2 className="mr-1.5 size-4" aria-hidden="true" />
                Xóa Input
              </Button>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" isLoading={pending}>
                {initial ? "Lưu thay đổi" : "Tạo Input"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface OutputNodeDialogProps extends DialogBaseProps {
  definitions: OutputDefinition[];
  initial?: OntologyOutput | null;
  onSubmit: (
    form: OutputNodeForm,
    definition: OutputDefinition
  ) => Promise<void>;
}

const emptyOutputForm = (definition?: OutputDefinition): OutputNodeForm => ({
  definition_id: definition?.id ?? "",
  name: "",
  description: "",
  multiple: false,
  required: true,
  fields: definition?.code === "custom_object" ? [emptySchemaField()] : [],
});

const outputFormFromNode = (
  definitions: OutputDefinition[],
  initial?: OntologyOutput | null
): OutputNodeForm =>
  initial
    ? {
        definition_id: initial.definition_id,
        name: initial.name,
        description: initial.description ?? "",
        multiple: initial.multiple,
        required: initial.required,
        fields: objectSchemaToFields(initial.value_schema),
      }
    : emptyOutputForm(definitions[0]);

export function OutputNodeDialog({
  open,
  onClose,
  definitions,
  initial,
  pending,
  onSubmit,
  onDelete,
}: OutputNodeDialogProps) {
  const [form, setForm] = useState<OutputNodeForm>(() =>
    outputFormFromNode(definitions, initial)
  );
  const [error, setError] = useState<string | null>(null);
  const definition = definitions.find((item) => item.id === form.definition_id);

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const parsed = (await import("../types")).outputNodeFormSchema.safeParse(
      form
    );
    if (!parsed.success)
      return setError(parsed.error.issues[0]?.message ?? "Output chưa hợp lệ.");
    if (!definition) return setError("Chọn loại Output.");
    if (
      definition.code === "custom_object" &&
      parsed.data.fields.length === 0
    ) {
      return setError("Custom Object cần ít nhất một trường.");
    }
    try {
      await onSubmit(parsed.data, definition);
      onClose();
    } catch (submitError) {
      setError(getOntologyApiError(submitError));
    }
  };

  const remove = async (): Promise<void> => {
    if (onDelete && (await onDelete())) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa Output" : "Tạo Output"}</DialogTitle>
          <DialogDescription>
            Chọn dạng kết quả. Chỉ Custom Object cần tự khai báo schema.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Tên Output" hint="Tên kết quả hiển thị trên node.">
            <Input
              name="ontology-output-name"
              autoComplete="off"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Phương tiện được phát hiện"
            />
          </Field>
          <Field
            label="Loại kết quả"
            hint={definition ? OUTPUT_TYPE_HELP[definition.code] : undefined}
          >
            <select
              name="ontology-output-definition"
              value={form.definition_id}
              onChange={(event) => {
                const next = definitions.find(
                  (item) => item.id === event.target.value
                );
                setForm({
                  ...form,
                  definition_id: event.target.value,
                  fields:
                    next?.code === "custom_object" ? [emptySchemaField()] : [],
                });
              }}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Chọn loại Output</option>
              {definitions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <CheckField
              name="ontology-output-multiple"
              label="Multiple"
              hint="Một Input có thể sinh nhiều kết quả."
              checked={form.multiple}
              onChange={(multiple) => setForm({ ...form, multiple })}
            />
            <CheckField
              name="ontology-output-required"
              label="Required"
              hint="Mỗi Input bắt buộc phải có kết quả."
              checked={form.required}
              onChange={(required) => setForm({ ...form, required })}
            />
          </div>
          {definition?.supports_categories && (
            <p className="flex gap-2 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{" "}
              Output này cần nối ít nhất một Category trước khi Publish.
            </p>
          )}
          {definition?.code === "custom_object" && (
            <SchemaFieldBuilder
              fields={form.fields}
              onChange={(fields) => setForm({ ...form, fields })}
            />
          )}
          <Field label="Mô tả" hint="Giải thích ý nghĩa của kết quả.">
            <Textarea
              name="ontology-output-description"
              value={form.description ?? ""}
              onChange={(description) => setForm({ ...form, description })}
            />
          </Field>
          {error && (
            <p className="text-sm text-rose-600" aria-live="polite">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:justify-between sm:space-x-0">
            {initial && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void remove()}
                disabled={pending}
              >
                <Trash2 className="mr-1.5 size-4" aria-hidden="true" />
                Xóa Output
              </Button>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" isLoading={pending}>
                {initial ? "Lưu thay đổi" : "Tạo Output"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CategoryNodeDialogProps extends DialogBaseProps {
  initial?: Category | null;
  onSubmit: (form: CategoryForm) => Promise<void>;
}

export function CategoryNodeDialog({
  open,
  onClose,
  initial,
  pending,
  onSubmit,
  onDelete,
}: CategoryNodeDialogProps) {
  const [form, setForm] = useState<CategoryForm>(() =>
    initial
      ? {
          key: initial.key,
          name: initial.name,
          color: initial.color ?? "#2563EB",
          description: initial.description ?? "",
        }
      : { key: "", name: "", color: "#2563EB", description: "" }
  );
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const parsed = (await import("../types")).categoryFormSchema.safeParse(
      form
    );
    if (!parsed.success)
      return setError(
        parsed.error.issues[0]?.message ?? "Category chưa hợp lệ."
      );
    try {
      await onSubmit(parsed.data);
      onClose();
    } catch (submitError) {
      setError(getOntologyApiError(submitError));
    }
  };

  const remove = async (): Promise<void> => {
    if (onDelete && (await onDelete())) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa Category" : "Tạo Category"}</DialogTitle>
          <DialogDescription>
            Category là nhãn độc lập và chỉ nối vào Output hỗ trợ nhãn.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Tên nhãn" hint="Tên người dùng nhìn thấy, ví dụ Ô tô.">
            <Input
              name="ontology-category-name"
              autoComplete="off"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Ô tô"
            />
          </Field>
          <Field label="Key" hint="Mã ổn định dùng khi xuất schema, ví dụ car.">
            <Input
              name="ontology-category-key"
              autoComplete="off"
              spellCheck={false}
              value={form.key}
              onChange={(event) =>
                setForm({
                  ...form,
                  key: event.target.value.toLowerCase().replace(/\s+/g, "_"),
                })
              }
              placeholder="car"
            />
          </Field>
          <Field
            label="Màu nhận diện"
            hint="Màu giúp phân biệt nhãn, không phải dấu hiệu duy nhất."
          >
            <div className="flex items-center gap-3">
              <input
                name="ontology-category-color-picker"
                type="color"
                value={form.color}
                onChange={(event) =>
                  setForm({ ...form, color: event.target.value })
                }
                className="size-11 rounded-md border border-slate-300 bg-white p-1"
                aria-label="Màu Category"
              />
              <Input
                name="ontology-category-color"
                value={form.color}
                onChange={(event) =>
                  setForm({ ...form, color: event.target.value })
                }
              />
            </div>
          </Field>
          <Field label="Mô tả" hint="Giải thích khi nào sử dụng nhãn này.">
            <Textarea
              name="ontology-category-description"
              value={form.description ?? ""}
              onChange={(description) => setForm({ ...form, description })}
            />
          </Field>
          {error && (
            <p className="text-sm text-rose-600" aria-live="polite">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:justify-between sm:space-x-0">
            {initial && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void remove()}
                disabled={pending}
              >
                <Trash2 className="mr-1.5 size-4" aria-hidden="true" />
                Xóa Category
              </Button>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" isLoading={pending}>
                {initial ? "Lưu thay đổi" : "Tạo Category"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
      {hint && (
        <span className="text-xs font-normal leading-5 text-slate-500">
          {hint}
        </span>
      )}
    </label>
  );
}

function Textarea({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      name={name}
      autoComplete="off"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={3}
      className="resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
    />
  );
}

function CheckField({
  name,
  label,
  hint,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
      <input
        name={name}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5"
      />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {hint}
        </span>
      </span>
    </label>
  );
}
