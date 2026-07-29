"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { Dataset } from "../types/dataset";
import {
  useCreateDatasetVersionMutation,
  useDatasetVersionQuery,
  usePublishDatasetVersionMutation,
  useVersionAssetsQuery,
} from "../hooks/use-datasets";
import { UploadDropzoneModal } from "./upload-dropzone-modal";
import { AssetGalleryGrid } from "./asset-gallery-grid";
import { AssetListTable } from "./asset-list-table";
import { AnnotationStatsBar } from "@/features/annotation";
import { useProjectOntologiesQuery } from "@/features/ontology/hooks/use-ontologies";

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
      ontologyVersions.find((v) => v.status === "published") ||
      ontologyVersions[0];
    return activeVer?.id;
  }, [ontologies]);

  const createVersionMutation = useCreateDatasetVersionMutation(
    dataset.id,
    projectId
  );
  const publishMutation = usePublishDatasetVersionMutation(
    activeVersionId,
    projectId
  );

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
          onSuccess: (created) => {
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
              <h2 className="text-lg font-bold">{dataset.name}</h2>
            </div>

            {/* Version Selector Dropdown */}
            <div className="ml-4 flex items-center gap-2">
              <span className="text-xs text-slate-400">Version:</span>
              <select
                value={activeVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="focus:ring-primary-500 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-2"
              >
                {versions.map((v) => (
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
    </div>
  );
}
