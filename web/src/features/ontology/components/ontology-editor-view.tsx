"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { Category, Ontology, OntologyVersion } from "../types/ontology";
import {
  useCloneVersionMutation,
  useOntologyVersionQuery,
  usePublishVersionMutation,
} from "../hooks/use-ontologies";
import { CategoryTreeView } from "./category-tree-view";
import { AttributeEditor } from "./attribute-editor";

interface OntologyEditorViewProps {
  ontology: Ontology;
  projectId: string;
}

export function OntologyEditorView({
  ontology,
  projectId,
}: OntologyEditorViewProps) {
  const versions = useMemo(() => ontology.versions || [], [ontology.versions]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    () => versions[0]?.id || ""
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  const activeVersionId = selectedVersionId || versions[0]?.id || "";

  const { data: versionDetail, isLoading } = useOntologyVersionQuery(
    activeVersionId
  );
  const publishMutation = usePublishVersionMutation(
    activeVersionId,
    projectId
  );
  const cloneMutation = useCloneVersionMutation(activeVersionId, projectId);

  const selectedCategory: Category | null = useMemo(() => {
    if (!versionDetail?.categories || !selectedCategoryId) return null;
    return (
      versionDetail.categories.find((c) => c.id === selectedCategoryId) || null
    );
  }, [versionDetail, selectedCategoryId]);

  const handlePublish = () => {
    if (
      confirm(
        `Bạn có chắc chắn muốn xuất bản (Publish) phiên bản "${versionDetail?.version}"? Sau khi xuất bản, phiên bản này sẽ bị KHÓA không thể chỉnh sửa.`
      )
    ) {
      publishMutation.mutate();
    }
  };

  const handleClone = () => {
    const nextVerStr = `v1.${versions.length}.0`;
    const newVersionName = prompt(
      "Nhập mã phiên bản mới (Clone Version):",
      nextVerStr
    );
    if (newVersionName && newVersionName.trim()) {
      cloneMutation.mutate(newVersionName.trim(), {
        onSuccess: (cloned: OntologyVersion) => {
          setSelectedVersionId(cloned.id);
        },
      });
    }
  };

  const isEditable = versionDetail?.status === "draft";

  return (
    <div className="space-y-4">
      {/* Editor Header Bar */}
      <Card className="p-4 bg-slate-900 text-slate-50 border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium">
                Ontology Schema
              </span>
              <h2 className="text-lg font-bold">{ontology.name}</h2>
            </div>

            {/* Version Selector Dropdown */}
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs text-slate-400">Version:</span>
              <select
                value={activeVersionId}
                onChange={(e) => {
                  setSelectedVersionId(e.target.value);
                  setSelectedCategoryId(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.version} ({v.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {versionDetail && (
              <Badge
                variant={
                  versionDetail.status === "published"
                    ? "success"
                    : versionDetail.status === "draft"
                    ? "secondary"
                    : "outline"
                }
              >
                {versionDetail.status.toUpperCase()}
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {versionDetail?.status === "draft" && (
              <Button
                variant="primary"
                size="sm"
                onClick={handlePublish}
                isLoading={publishMutation.isPending}
              >
                ✓ Publish Version
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleClone}
              isLoading={cloneMutation.isPending}
              className="border-slate-700 text-slate-200 hover:bg-slate-800"
            >
              📋 Clone Version
            </Button>
          </div>
        </div>
      </Card>

      {/* Editor Body Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-slate-500">
          Đang tải cấu trúc Ontology...
        </div>
      ) : versionDetail ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[500px]">
          {/* Left Panel: Category Tree */}
          <div className="md:col-span-5">
            <CategoryTreeView
              versionId={versionDetail.id}
              categories={versionDetail.categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={(cat) => setSelectedCategoryId(cat.id)}
              isEditable={isEditable}
            />
          </div>

          {/* Right Panel: Attributes Editor */}
          <div className="md:col-span-7">
            <AttributeEditor
              versionId={versionDetail.id}
              category={selectedCategory}
              isEditable={isEditable}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
