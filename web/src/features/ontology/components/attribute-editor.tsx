"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { Attribute, Category } from "../types/ontology";
import { useDeleteAttributeMutation } from "../hooks/use-ontologies";
import { AttributeFormModal } from "./attribute-form-modal";

interface AttributeEditorProps {
  versionId: string;
  category: Category | null;
  isEditable: boolean;
}

export function AttributeEditor({
  versionId,
  category,
  isEditable,
}: AttributeEditorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<Attribute | null>(null);

  const deleteMutation = useDeleteAttributeMutation(versionId);

  if (!category) {
    return (
      <Card className="flex h-full items-center justify-center p-8 text-center text-slate-500">
        <div>
          <p className="text-sm font-medium">Chưa chọn nhãn nào</p>
          <p className="mt-1 text-xs text-slate-400">
            Vui lòng chọn một Category ở cây bên trái để xem và biên tập thuộc
            tính.
          </p>
        </div>
      </Card>
    );
  }

  const handleDelete = (attrId: string, attrName: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa thuộc tính "${attrName}"?`)) {
      deleteMutation.mutate(attrId);
    }
  };

  const typeBadgeColors: Record<string, string> = {
    string: "bg-blue-500/15 text-blue-600 border-blue-500/20",
    number: "bg-amber-500/15 text-amber-600 border-amber-500/20",
    boolean: "bg-purple-500/15 text-purple-600 border-purple-500/20",
    enum: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    list: "bg-indigo-500/15 text-indigo-600 border-indigo-500/20",
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <div>
            <CardTitle>{category.display_name || category.name}</CardTitle>
            <p className="mt-0.5 font-mono text-xs text-slate-500">
              code: {category.name}
            </p>
          </div>
        </div>

        {isEditable && (
          <Button
            size="sm"
            onClick={() => {
              setEditingAttr(null);
              setIsModalOpen(true);
            }}
          >
            + Thêm thuộc tính
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-3 overflow-y-auto p-4">
        {category.attributes.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Chưa có thuộc tính nào cho nhãn này.
          </div>
        ) : (
          category.attributes.map((attr) => (
            <div
              key={attr.id}
              className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {attr.name}
                  </span>
                  {attr.display_name && (
                    <span className="text-xs text-slate-500">
                      ({attr.display_name})
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      typeBadgeColors[attr.type] ||
                      "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {attr.type}
                  </span>
                  {attr.required && (
                    <Badge variant="destructive" className="py-0 text-[10px]">
                      Required
                    </Badge>
                  )}
                </div>

                {isEditable && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingAttr(attr);
                        setIsModalOpen(true);
                      }}
                      className="text-primary-600 px-1.5 py-0.5 text-xs hover:underline"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(attr.id, attr.name)}
                      className="px-1.5 py-0.5 text-xs text-rose-600 hover:underline"
                    >
                      Xóa
                    </button>
                  </div>
                )}
              </div>

              {attr.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {attr.description}
                </p>
              )}

              {/* Enum Allowed Values Display */}
              {attr.type === "enum" && Array.isArray(attr.allowed_values) && (
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="self-center text-[11px] text-slate-500">
                    Options:
                  </span>
                  {attr.allowed_values.map((v) => (
                    <span
                      key={v}
                      className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] dark:border-slate-700 dark:bg-slate-800"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>

      <AttributeFormModal
        versionId={versionId}
        categoryId={category.id}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAttr(null);
        }}
        editingAttribute={editingAttr}
      />
    </Card>
  );
}
