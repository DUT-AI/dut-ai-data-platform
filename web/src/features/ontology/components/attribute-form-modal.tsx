"use client";

import { useState } from "react";
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
import { Attribute, AttributeType } from "../types";
import {
  useCreateAttributeMutation,
  useUpdateAttributeMutation,
} from "../hooks";

interface AttributeFormModalProps {
  versionId: string;
  categoryId: string;
  isOpen: boolean;
  onClose: () => void;
  editingAttribute?: Attribute | null;
}

export function AttributeFormModal({
  versionId,
  categoryId,
  isOpen,
  onClose,
  editingAttribute,
}: AttributeFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && (
        <AttributeFormContent
          versionId={versionId}
          categoryId={categoryId}
          onClose={onClose}
          editingAttribute={editingAttribute}
        />
      )}
    </Dialog>
  );
}

function AttributeFormContent({
  versionId,
  categoryId,
  onClose,
  editingAttribute,
}: {
  versionId: string;
  categoryId: string;
  onClose: () => void;
  editingAttribute?: Attribute | null;
}) {
  const [name, setName] = useState(editingAttribute?.name || "");
  const [displayName, setDisplayName] = useState(
    editingAttribute?.display_name || ""
  );
  const [type, setType] = useState<AttributeType>(
    editingAttribute?.type || "string"
  );
  const [required, setRequired] = useState(editingAttribute?.required || false);
  const [defaultValue, setDefaultValue] = useState(
    editingAttribute?.default_value || ""
  );
  const [enumOptions, setEnumOptions] = useState<string[]>(
    Array.isArray(editingAttribute?.allowed_values)
      ? (editingAttribute?.allowed_values as string[])
      : []
  );
  const [enumInput, setEnumInput] = useState("");
  const [description, setDescription] = useState(
    editingAttribute?.description || ""
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = useCreateAttributeMutation(versionId);
  const updateMutation = useUpdateAttributeMutation(versionId);

  const handleAddEnum = () => {
    const trimmed = enumInput.trim();
    if (trimmed && !enumOptions.includes(trimmed)) {
      setEnumOptions([...enumOptions, trimmed]);
      setEnumInput("");
    }
  };

  const handleRemoveEnum = (val: string) => {
    setEnumOptions(enumOptions.filter((o) => o !== val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setErrorMsg(null);
    const payload = {
      name: name.trim(),
      display_name: displayName.trim() || undefined,
      type,
      required,
      default_value: defaultValue.trim() || undefined,
      allowed_values: type === "enum" ? enumOptions : undefined,
      description: description.trim() || undefined,
    };

    if (editingAttribute) {
      updateMutation.mutate(
        { attributeId: editingAttribute.id, payload },
        {
          onSuccess: () => onClose(),
          onError: (err: unknown) => {
            const msg =
              (err as { response?: { data?: { detail?: string } } })?.response
                ?.data?.detail || "Không thể cập nhật thuộc tính.";
            setErrorMsg(msg);
          },
        }
      );
    } else {
      createMutation.mutate(
        { categoryId, payload },
        {
          onSuccess: () => onClose(),
          onError: (err: unknown) => {
            const msg =
              (err as { response?: { data?: { detail?: string } } })?.response
                ?.data?.detail || "Không thể tạo thuộc tính mới.";
            setErrorMsg(msg);
          },
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>
          {editingAttribute ? "Chỉnh sửa Thuộc tính" : "Thêm Thuộc tính mới"}
        </DialogTitle>
        <DialogDescription>
          Định nghĩa các trường thuộc tính dữ liệu gán cho Category.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {errorMsg && (
          <div className="rounded-md border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Mã thuộc tính (Key) <span className="text-rose-500">*</span>
          </label>
          <Input
            placeholder="VD: license_plate, fuel_type, is_valid"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Tên hiển thị
          </label>
          <Input
            placeholder="VD: Biển số xe, Loại nhiên liệu"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Kiểu dữ liệu <span className="text-rose-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AttributeType)}
              className="focus:ring-primary-500 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="string">String (Văn bản)</option>
              <option value="number">Number (Số)</option>
              <option value="boolean">Boolean (Đúng/Sai)</option>
              <option value="enum">Enum (Danh sách tùy chọn)</option>
              <option value="list">List (Mảng danh sách)</option>
            </select>
          </div>

          <div className="flex flex-col justify-end space-y-1.5">
            <label className="flex cursor-pointer items-center gap-2 pb-2">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Bắt buộc (Required)
              </span>
            </label>
          </div>
        </div>

        {/* Enum Options Editor */}
        {type === "enum" && (
          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Danh sách lựa chọn Enum (Allowed Values)
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Nhập tùy chọn..."
                value={enumInput}
                onChange={(e) => setEnumInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddEnum();
                  }
                }}
                className="h-8 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEnum}
                className="h-8"
              >
                Thêm
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {enumOptions.map((opt) => (
                <span
                  key={opt}
                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {opt}
                  <button
                    type="button"
                    onClick={() => handleRemoveEnum(opt)}
                    className="ml-0.5 text-slate-400 hover:text-rose-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Giá trị mặc định
          </label>
          <Input
            placeholder="VD: Gasoline"
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Mô tả thuộc tính
          </label>
          <textarea
            placeholder="Ghi chú thêm về thuộc tính này..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="focus:ring-primary-500 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Hủy
          </Button>
          <Button type="submit" isLoading={isPending}>
            {editingAttribute ? "Lưu thuộc tính" : "Thêm thuộc tính"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
