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
import { Category, PRESET_COLORS } from "../types/ontology";
import {
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
} from "../hooks/use-ontologies";

interface CategoryFormModalProps {
  versionId: string;
  isOpen: boolean;
  onClose: () => void;
  allCategories: Category[];
  editingCategory?: Category | null;
  defaultParentId?: string | null;
}

export function CategoryFormModal({
  versionId,
  isOpen,
  onClose,
  allCategories,
  editingCategory,
  defaultParentId,
}: CategoryFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && (
        <CategoryFormContent
          versionId={versionId}
          onClose={onClose}
          allCategories={allCategories}
          editingCategory={editingCategory}
          defaultParentId={defaultParentId}
        />
      )}
    </Dialog>
  );
}

function CategoryFormContent({
  versionId,
  onClose,
  allCategories,
  editingCategory,
  defaultParentId,
}: {
  versionId: string;
  onClose: () => void;
  allCategories: Category[];
  editingCategory?: Category | null;
  defaultParentId?: string | null;
}) {
  const [name, setName] = useState(editingCategory?.name || "");
  const [displayName, setDisplayName] = useState(
    editingCategory?.display_name || ""
  );
  const [description, setDescription] = useState(
    editingCategory?.description || ""
  );
  const [color, setColor] = useState(editingCategory?.color || "#3B82F6");
  const [parentId, setParentId] = useState<string | null>(
    editingCategory ? editingCategory.parent_category_id : defaultParentId || null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = useCreateCategoryMutation(versionId);
  const updateMutation = useUpdateCategoryMutation(versionId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setErrorMsg(null);
    const payload = {
      name: name.trim(),
      display_name: displayName.trim() || undefined,
      description: description.trim() || undefined,
      color,
      parent_category_id: parentId || null,
    };

    if (editingCategory) {
      updateMutation.mutate(
        { categoryId: editingCategory.id, payload },
        {
          onSuccess: () => onClose(),
          onError: (err: unknown) => {
            const msg =
              (err as { response?: { data?: { detail?: string } } })?.response
                ?.data?.detail || "Không thể cập nhật nhãn.";
            setErrorMsg(msg);
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => onClose(),
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { detail?: string } } })?.response
              ?.data?.detail || "Không thể tạo nhãn mới.";
          setErrorMsg(msg);
        },
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>
          {editingCategory ? "Chỉnh sửa Nhãn (Category)" : "Thêm Nhãn mới"}
        </DialogTitle>
        <DialogDescription>
          Tạo hoặc cập nhật danh mục nhãn gán cho dữ liệu.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {errorMsg && (
          <div className="p-3 text-xs rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            {errorMsg}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Mã danh mục (System Name) <span className="text-rose-500">*</span>
          </label>
          <Input
            placeholder="VD: car, truck, pedestrian"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Tên hiển thị (Display Name)
          </label>
          <Input
            placeholder="VD: Xe Ô tô, Người đi bộ"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        {/* Color Picker Palette */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Màu đại diện (Color Badge)
          </label>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-full transition-transform ${
                  color === c ? "ring-2 ring-offset-2 ring-primary-500 scale-110" : ""
                }`}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded border-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Parent Category Selection */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Nhãn cấp cha (Parent Category)
          </label>
          <select
            value={parentId || ""}
            onChange={(e) => setParentId(e.target.value || null)}
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">-- Cấp gốc (Root Category) --</option>
            {allCategories
              .filter((c) => c.id !== editingCategory?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name || c.name} ({c.name})
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Mô tả nhãn
          </label>
          <textarea
            placeholder="Mô tả hướng dẫn cho gán nhãn viên..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            {editingCategory ? "Lưu thay đổi" : "Tạo nhãn mới"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
