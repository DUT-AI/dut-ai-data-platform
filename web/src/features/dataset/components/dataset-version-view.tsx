"use client";

import React, { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/components/ui";
import { Dataset, DatasetVersion } from "../types";
import {
  useCreateDatasetVersionMutation,
  useDatasetVersionQuery,
  usePublishDatasetVersionMutation,
  useUpdateDatasetMutation,
  useVersionAssetsQuery,
} from "../hooks";
import { UploadDropzoneModal } from "./upload-dropzone-modal";
import { AssetGalleryGrid } from "./asset-gallery-grid";
import { AssetListTable } from "./asset-list-table";
import { AnnotationStatsBar } from "@/features/annotation";
import { useProjectOntologiesQuery } from "@/features/ontology";

interface DatasetVersionViewProps {
  dataset: Dataset;
  projectId: string;
}

export function DatasetVersionView({
  dataset,
  projectId,
}: DatasetVersionViewProps) {
  const versions = useMemo(() => dataset.versions || [], [dataset.versions]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    () => versions[0]?.id || ""
  );
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditDatasetOpen, setIsEditDatasetOpen] = useState(false);
  const [editName, setEditName] = useState(dataset.name);
  const [editDescription, setEditDescription] = useState(dataset.description || "");

  const activeVersionId = selectedVersionId || versions[0]?.id || "";

  const { data: versionDetail, isLoading: isVerLoading } =
    useDatasetVersionQuery(activeVersionId);
  const { data: assets, isLoading: isAssetsLoading } =
    useVersionAssetsQuery(activeVersionId);

  // Lấy các Ontology của project này
  const { data: ontologies } = useProjectOntologiesQuery(projectId);

  // Tìm ontologyVersionId hợp lệ đầu tiên để truyền xuống
  const ontologyVersionId = useMemo(() => {
    if (!ontologies || ontologies.length === 0) return undefined;
    const firstOntology = ontologies[0];
    const ontologyVersions = firstOntology.versions || [];
    // Ưu tiên bản published hoặc bản đầu tiên
    const activeVer =
      ontologyVersions.find((v: { status: string; id: string }) => v.status === "published") ||
      ontologyVersions[0];
    return activeVer?.id;
  }, [ontologies]);

  const createVersionMutation = useCreateDatasetVersionMutation(
    dataset.id,
    projectId
  );
  const updateDatasetMutation = useUpdateDatasetMutation(
    dataset.id,
    projectId
  );
  const publishMutation = usePublishDatasetVersionMutation(
    activeVersionId,
    projectId
  );

  const handleEditDatasetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    updateDatasetMutation.mutate(
      { name: editName.trim(), description: editDescription.trim() || undefined },
      {
        onSuccess: () => {
          setIsEditDatasetOpen(false);
        },
      }
    );
  };

  const handleCreateVersion = () => {
    const nextVerStr = `v1.${versions.length}.0`;
    const newVer = prompt(
      "Nhập tên phiên bản mới (Dataset Version):",
      nextVerStr
    );
    if (newVer && newVer.trim()) {
      createVersionMutation.mutate(
        { version: newVer.trim() },
        {
          onSuccess: (created: { id: string }) => {
            setSelectedVersionId(created.id);
          },
        }
      );
    }
  };

  const handlePublish = () => {
    if (
      confirm(
        `Bạn có chắc chắn muốn xuất bản phiên bản "${versionDetail?.version}"? Phiên bản sau khi xuất bản sẽ bị KHÓA không thể thêm/xóa tập tin.`
      )
    ) {
      publishMutation.mutate();
    }
  };

  const isEditable = versionDetail?.status === "draft";

  return (
    <div className="space-y-6">
      {/* Header Version Bar */}
      <Card className="border-slate-800 bg-slate-900 p-4 text-slate-50">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-400">
                Dataset
              </span>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{dataset.name}</h2>
                <button
                  onClick={() => {
                    setEditName(dataset.name);
                    setEditDescription(dataset.description || "");
                    setIsEditDatasetOpen(true);
                  }}
                  title="Đổi tên / Chỉnh sửa Dataset"
                  className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 shadow-sm transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white"
                >
                  <svg
                    className="h-3.5 w-3.5 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  <span>Sửa Dataset ✏️</span>
                </button>
              </div>
            </div>

            {/* Version Selector Dropdown */}
            <div className="ml-4 flex items-center gap-2">
              <span className="text-xs text-slate-400">Version:</span>
              <select
                value={activeVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="focus:ring-primary-500 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-2"
              >
                {versions.map((v: DatasetVersion) => (
                  <option key={v.id} value={v.id}>
                    {v.version} ({v.status.toUpperCase()}) - {v.asset_count}{" "}
                    assets
                  </option>
                ))}
              </select>

              <button
                onClick={handleCreateVersion}
                title="Tạo phiên bản mới"
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
              >
                + Version
              </button>
            </div>

            {versionDetail && (
              <Badge
                variant={
                  versionDetail.status === "published" ? "success" : "secondary"
                }
              >
                {versionDetail.status.toUpperCase()}
              </Badge>
            )}
          </div>

          {/* Header Action Buttons & View Toggle */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800 p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-slate-700 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-slate-700 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Table
              </button>
            </div>

            {isEditable && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsUploadOpen(true)}
                  className="border-slate-700 text-slate-200 hover:bg-slate-800"
                >
                  + Batch Upload
                </Button>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={handlePublish}
                  isLoading={publishMutation.isPending}
                >
                  ✓ Publish Version
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Annotation Stats Progress Bar */}
      <AnnotationStatsBar
        totalAssets={assets?.length || 0}
        annotatedAssets={assets?.length ? Math.round(assets.length * 0.4) : 0}
      />

      {/* Asset Gallery Body */}
      {isVerLoading || isAssetsLoading ? (
        <div className="p-12 text-center text-sm text-slate-500">
          Đang tải danh sách tập tin dữ liệu thô...
        </div>
      ) : assets ? (
        viewMode === "grid" ? (
          <AssetGalleryGrid
            versionId={activeVersionId}
            assets={assets}
            isEditable={isEditable}
            projectId={projectId}
            ontologyVersionId={ontologyVersionId}
          />
        ) : (
          <AssetListTable
            versionId={activeVersionId}
            assets={assets}
            isEditable={isEditable}
            projectId={projectId}
            ontologyVersionId={ontologyVersionId}
          />
        )
      ) : null}

      <UploadDropzoneModal
        versionId={activeVersionId}
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />

      {/* Edit Dataset Modal */}
      <Dialog
        open={isEditDatasetOpen}
        onOpenChange={(open) => !open && setIsEditDatasetOpen(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa bộ Dữ liệu (Dataset)</DialogTitle>
            <DialogDescription>
              Cập nhật tên hiển thị và mô tả cho bộ dữ liệu này.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditDatasetSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Tên Dataset <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Nhập tên Dataset..."
                value={editName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Mô tả
              </label>
              <textarea
                placeholder="Nhập mô tả Dataset..."
                value={editDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditDescription(e.target.value)}
                rows={3}
                className="focus:ring-primary-500 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDatasetOpen(false)}
                disabled={updateDatasetMutation.isPending}
              >
                Hủy
              </Button>
              <Button type="submit" isLoading={updateDatasetMutation.isPending}>
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
