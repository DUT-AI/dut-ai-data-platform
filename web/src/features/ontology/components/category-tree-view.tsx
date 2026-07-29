"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { Category } from "../types/ontology";
import { useDeleteCategoryMutation } from "../hooks/use-ontologies";
import { CategoryFormModal } from "./category-form-modal";

interface CategoryTreeViewProps {
  versionId: string;
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (category: Category) => void;
  isEditable: boolean;
}

export function CategoryTreeView({
  versionId,
  categories,
  selectedCategoryId,
  onSelectCategory,
  isEditable,
}: CategoryTreeViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);

  const deleteMutation = useDeleteCategoryMutation(versionId);

  // Build category hierarchy tree (roots & children)
  const categoryTree = useMemo(() => {
    const map = new Map<string, Category & { children: Category[] }>();
    categories.forEach((cat) => map.set(cat.id, { ...cat, children: [] }));

    const roots: (Category & { children: Category[] })[] = [];
    map.forEach((cat) => {
      if (cat.parent_category_id && map.has(cat.parent_category_id)) {
        map.get(cat.parent_category_id)!.children.push(cat);
      } else {
        roots.push(cat);
      }
    });

    return roots;
  }, [categories]);

  const handleDeleteCategory = (catId: string, catName: string) => {
    if (
      confirm(
        `Bạn có chắc chắn muốn xóa nhãn "${catName}" và các thuộc tính liên quan?`
      )
    ) {
      deleteMutation.mutate(catId);
    }
  };

  const renderCategoryNode = (
    node: Category & { children?: Category[] },
    depth = 0
  ) => {
    const isSelected = selectedCategoryId === node.id;

    return (
      <div key={node.id} className="space-y-1">
        <div
          onClick={() => onSelectCategory(node)}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          className={`flex cursor-pointer items-center justify-between rounded-md border py-2 pr-3 text-sm transition-colors ${
            isSelected
              ? "bg-primary-500/10 border-primary-500/30 text-primary-600 font-semibold"
              : "border-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full"
              style={{ backgroundColor: node.color }}
            />
            <span className="truncate">{node.display_name || node.name}</span>
            <span className="shrink-0 font-mono text-xs text-slate-400">
              ({node.name})
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <span className="rounded bg-slate-200/60 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {node.attributes.length} attrs
            </span>

            {isEditable && (
              <div className="flex items-center opacity-80 hover:opacity-100">
                <button
                  title="Thêm nhãn con"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCategory(null);
                    setDefaultParentId(node.id);
                    setIsModalOpen(true);
                  }}
                  className="hover:text-primary-600 p-1 text-xs"
                >
                  + Sub
                </button>
                <button
                  title="Sửa nhãn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCategory(node);
                    setIsModalOpen(true);
                  }}
                  className="p-1 text-xs hover:text-amber-600"
                >
                  Sửa
                </button>
                <button
                  title="Xóa nhãn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(node.id, node.name);
                  }}
                  className="p-1 text-xs hover:text-rose-600"
                >
                  Xóa
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recursive Children */}
        {node.children && node.children.length > 0 && (
          <div className="space-y-1">
            {node.children.map((child) =>
              renderCategoryNode(
                child as Category & { children?: Category[] },
                depth + 1
              )
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <CardTitle className="text-base">
          Cấu trúc Nhãn ({categories.length})
        </CardTitle>
        {isEditable && (
          <Button
            size="sm"
            onClick={() => {
              setEditingCategory(null);
              setDefaultParentId(null);
              setIsModalOpen(true);
            }}
          >
            + Thêm Nhãn Root
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-1 overflow-y-auto p-3">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Chưa có nhãn nào. Hãy nhấn nút &quot;+ Thêm Nhãn Root&quot; để khởi
            tạo.
          </div>
        ) : (
          categoryTree.map((node) => renderCategoryNode(node))
        )}
      </CardContent>

      <CategoryFormModal
        versionId={versionId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
          setDefaultParentId(null);
        }}
        allCategories={categories}
        editingCategory={editingCategory}
        defaultParentId={defaultParentId}
      />
    </Card>
  );
}
