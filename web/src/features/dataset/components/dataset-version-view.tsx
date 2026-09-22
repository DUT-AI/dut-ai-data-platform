"use client";

import React, { useMemo, useState } from "react";
import {
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/components/ui";
import {
  GitBranchPlus,
  Grid2X2,
  List,
  Pencil,
  Plus,
  Upload,
  Workflow,
} from "lucide-react";
import { Dataset, DatasetVersion } from "../types";
import {
  useCreateDatasetVersionMutation,
  useDatasetVersionQuery,
  usePublishDatasetVersionMutation,
  useUpdateDatasetMutation,
  useVersionAssetsQuery,
} from "../hooks";
import {
  AssetFilterToolbar,
  DateOption,
  FileTypeOption,
} from "./asset-filter-toolbar";
import { UploadDropzoneModal } from "./upload-dropzone-modal";
import { InheritVersionModal } from "./inherit-version-modal";
import { AssetGalleryGrid } from "./asset-gallery-grid";
import { AssetListTable } from "./asset-list-table";
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
  const [isInheritOpen, setIsInheritOpen] = useState(false);
  const [isEditDatasetOpen, setIsEditDatasetOpen] = useState(false);
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [newVersionName, setNewVersionName] = useState(
    `v1.${versions.length}.0`
  );
  const [editName, setEditName] = useState(dataset.name);
  const [editDescription, setEditDescription] = useState(
    dataset.description || ""
  );

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("all");
  const [selectedDate, setSelectedDate] = useState("all");

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
      ontologyVersions.find(
        (v: { status: string; id: string }) => v.status === "published"
      ) || ontologyVersions[0];
    return activeVer?.id;
  }, [ontologies]);

  // Computed available file types present in the current dataset version assets
  const fileTypeOptions = useMemo<FileTypeOption[]>(() => {
    if (!assets || assets.length === 0) return [];
    const map = new Map<string, { label: string; count: number }>();

    assets.forEach((asset) => {
      const mime = asset.mime_type || "application/octet-stream";
      const ext = asset.filename.includes(".")
        ? asset.filename.split(".").pop()?.toLowerCase() || ""
        : mime.split("/")[1] || "file";

      const displayLabel = ext ? ext.toUpperCase() : mime;

      if (map.has(mime)) {
        map.get(mime)!.count += 1;
      } else {
        map.set(mime, { label: displayLabel, count: 1 });
      }
    });

    return Array.from(map.entries()).map(([mimeType, val]) => ({
      mimeType,
      label: val.label,
      count: val.count,
    }));
  }, [assets]);

  // Computed available dates present in the dataset version assets
  const dateOptions = useMemo<DateOption[]>(() => {
    if (!assets || assets.length === 0) return [];
    const map = new Map<string, { displayLabel: string; count: number }>();

    assets.forEach((asset) => {
      if (!asset.created_at) return;
      const dateObj = new Date(asset.created_at);
      if (isNaN(dateObj.getTime())) return;

      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
      const dd = String(dateObj.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const displayLabel = `${dd}/${mm}/${yyyy}`;

      if (map.has(dateStr)) {
        map.get(dateStr)!.count += 1;
      } else {
        map.set(dateStr, { displayLabel, count: 1 });
      }
    });

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateStr, val]) => ({
        dateStr,
        displayLabel: val.displayLabel,
        count: val.count,
      }));
  }, [assets]);

  // Filtered assets list based on search and selected filters
  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    return assets.filter((asset) => {
      // 1. Filename search filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!asset.filename.toLowerCase().includes(q)) {
          return false;
        }
      }

      // 2. File type filter
      if (selectedFileType !== "all") {
        if (asset.mime_type !== selectedFileType) {
          return false;
        }
      }

      // 3. Date filter
      if (selectedDate !== "all") {
        if (!asset.created_at) return false;
        const dateObj = new Date(asset.created_at);
        if (isNaN(dateObj.getTime())) return false;
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
        const dd = String(dateObj.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        if (dateStr !== selectedDate) {
          return false;
        }
      }

      return true;
    });
  }, [assets, searchQuery, selectedFileType, selectedDate]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedFileType("all");
    setSelectedDate("all");
  };

  const createVersionMutation = useCreateDatasetVersionMutation(
    dataset.id,
    projectId
  );
  const updateDatasetMutation = useUpdateDatasetMutation(dataset.id, projectId);
  const publishMutation = usePublishDatasetVersionMutation(
    activeVersionId,
    projectId
  );

  const handleEditDatasetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    updateDatasetMutation.mutate(
      {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      },
      {
        onSuccess: () => {
          setIsEditDatasetOpen(false);
        },
      }
    );
  };

  const handleCreateVersion = async () => {
    const version = newVersionName.trim();
    if (!version) return;
    const created = await createVersionMutation.mutateAsync({ version });
    setSelectedVersionId(created.id);
    setIsCreateVersionOpen(false);
  };

  const handlePublish = async () => {
    await publishMutation.mutateAsync();
    setIsPublishOpen(false);
  };

  const isEditable = versionDetail?.status === "draft";

  return (
    <div className="space-y-6">
      {/* Dataset and version command bar */}
      <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  Dataset đang làm việc
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-lg font-bold text-slate-950 sm:text-xl">
                    {dataset.name}
                  </h2>
                  {versionDetail && (
                    <Badge
                      variant={
                        versionDetail.status === "published"
                          ? "success"
                          : "secondary"
                      }
                    >
                      {versionDetail.status === "published"
                        ? "Published"
                        : "Draft"}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditName(dataset.name);
                  setEditDescription(dataset.description || "");
                  setIsEditDatasetOpen(true);
                }}
                className="min-h-10 shrink-0 border-blue-200 bg-white text-blue-800 hover:border-blue-300 hover:bg-blue-100"
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Sửa dataset
              </Button>
            </div>

            <div className="grid gap-3 rounded-xl border border-blue-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="min-w-0">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Phiên bản dữ liệu
                </span>
                <select
                  value={activeVersionId}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {versions.map((v: DatasetVersion) => (
                    <option key={v.id} value={v.id}>
                      {v.version} · {v.status.toUpperCase()} · {v.asset_count}{" "}
                      assets
                    </option>
                  ))}
                </select>
              </label>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNewVersionName(`v1.${versions.length}.0`);
                  setIsCreateVersionOpen(true);
                }}
                className="min-h-11 border-blue-200 bg-white text-blue-800 hover:border-blue-300 hover:bg-blue-50"
              >
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Tạo version
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div
              className="inline-flex w-fit items-center rounded-lg border border-slate-200 bg-white p-1"
              aria-label="Chế độ hiển thị asset"
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-pressed={viewMode === "grid"}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors duration-150 ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <Grid2X2 className="h-3.5 w-3.5" aria-hidden="true" />
                Lưới
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-pressed={viewMode === "table"}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors duration-150 ${
                  viewMode === "table"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <List className="h-3.5 w-3.5" aria-hidden="true" />
                Bảng
              </button>
            </div>

            {isEditable && (
              <div className="flex flex-wrap gap-2 xl:justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsInheritOpen(true)}
                  className="min-h-10 border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                >
                  <Workflow className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Kế thừa
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsUploadOpen(true)}
                  className="min-h-10 border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Tải dữ liệu
                </Button>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsPublishOpen(true)}
                  isLoading={publishMutation.isPending}
                  className="min-h-10"
                >
                  Publish version
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Search & Filter Toolbar */}
      {assets && assets.length > 0 && (
        <AssetFilterToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedFileType={selectedFileType}
          onFileTypeChange={setSelectedFileType}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          fileTypeOptions={fileTypeOptions}
          dateOptions={dateOptions}
          totalAssetsCount={assets.length}
          filteredAssetsCount={filteredAssets.length}
          onResetFilters={handleResetFilters}
        />
      )}

      {/* Asset Gallery Body */}
      {isVerLoading || isAssetsLoading ? (
        <div className="p-12 text-center text-sm text-slate-500">
          Đang tải danh sách tập tin dữ liệu thô...
        </div>
      ) : assets ? (
        viewMode === "grid" ? (
          <AssetGalleryGrid
            versionId={activeVersionId}
            assets={filteredAssets}
            totalAssetsCount={assets.length}
            onResetFilters={handleResetFilters}
            isEditable={isEditable}
            projectId={projectId}
            ontologyVersionId={ontologyVersionId}
          />
        ) : (
          <AssetListTable
            versionId={activeVersionId}
            assets={filteredAssets}
            totalAssetsCount={assets.length}
            onResetFilters={handleResetFilters}
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

      <InheritVersionModal
        versionId={activeVersionId}
        currentVersionString={
          versionDetail?.version ||
          versions.find((v) => v.id === activeVersionId)?.version ||
          ""
        }
        datasetVersions={versions}
        isOpen={isInheritOpen}
        onClose={() => setIsInheritOpen(false)}
        projectId={projectId}
      />

      <Dialog
        open={isCreateVersionOpen}
        onOpenChange={(open) => !open && setIsCreateVersionOpen(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo dataset version</DialogTitle>
            <DialogDescription>
              Version mới bắt đầu ở trạng thái Draft để bạn có thể thêm và kiểm
              tra asset trước khi publish.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateVersion();
            }}
          >
            <div>
              <label
                htmlFor="dataset-version-name"
                className="text-sm font-medium"
              >
                Tên version
              </label>
              <Input
                id="dataset-version-name"
                className="mt-1.5"
                value={newVersionName}
                onChange={(event) => setNewVersionName(event.target.value)}
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateVersionOpen(false)}
              >
                Huỷ
              </Button>
              <Button type="submit" isLoading={createVersionMutation.isPending}>
                <GitBranchPlus className="mr-2 h-4 w-4" />
                Tạo version
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isPublishOpen}
        title={`Publish “${versionDetail?.version || "version này"}”?`}
        description="Sau khi publish, version trở thành bất biến: không thể thêm hoặc xoá asset. Hãy kiểm tra dữ liệu trước khi tiếp tục."
        confirmLabel="Publish version"
        isLoading={publishMutation.isPending}
        onClose={() => setIsPublishOpen(false)}
        onConfirm={handlePublish}
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditName(e.target.value)
                }
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
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditDescription(e.target.value)
                }
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
