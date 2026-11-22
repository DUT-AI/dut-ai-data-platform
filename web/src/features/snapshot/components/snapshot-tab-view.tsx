"use client";

import * as React from "react";
import { GitCompare, PackageCheck, Plus, RefreshCw } from "lucide-react";
import { Button, ConfirmDialog, EmptyState, Notice } from "@/components/ui";
import { useUserQuery } from "@/features/auth/hooks";
import { useProjectMembersQuery } from "@/features/projects/hooks";
import { extractErrorMessage } from "../api/snapshot-api";
import {
  useArchiveOrPurgeSnapshotMutation,
  useCancelSnapshotMutation,
  useSnapshotsQuery,
} from "../hooks/use-snapshot";
import type { SnapshotResponse, SnapshotStatus } from "../types";
import { CreateSnapshotModal } from "./create-snapshot-modal";
import { ManageTagsModal } from "./manage-tags-modal";
import { SnapshotCard } from "./snapshot-card";
import { SnapshotDiffModal } from "./snapshot-diff-modal";
import { SnapshotItemsModal } from "./snapshot-items-modal";
import { SnapshotManifestModal } from "./snapshot-manifest-modal";

interface SnapshotTabViewProps {
  projectId: string;
}

type FilterTab = "ALL" | SnapshotStatus;

export function SnapshotTabView({ projectId }: SnapshotTabViewProps) {
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>("ALL");

  // Auth and Project Member info to check owner permissions
  const { data: currentUser } = useUserQuery();
  const { data: members } = useProjectMembersQuery(projectId);

  const isOwner = React.useMemo(() => {
    if (!currentUser || !members) return false;
    const currentMember = members.find(
      (m) => String(m.user_id) === String(currentUser.id)
    );
    return currentMember?.role === "owner";
  }, [currentUser, members]);

  // Query snapshots
  const {
    data: snapshots,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useSnapshotsQuery(
    projectId,
    activeFilter === "ALL" ? undefined : (activeFilter as SnapshotStatus)
  );

  // Modals state
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [manifestSnapshot, setManifestSnapshot] =
    React.useState<SnapshotResponse | null>(null);
  const [itemsSnapshot, setItemsSnapshot] =
    React.useState<SnapshotResponse | null>(null);
  const [diffModalOpen, setDiffModalOpen] = React.useState(false);
  const [diffInitialBaseId, setDiffInitialBaseId] = React.useState<
    string | undefined
  >();
  const [tagsSnapshot, setTagsSnapshot] =
    React.useState<SnapshotResponse | null>(null);

  // Confirmation dialogs state
  const [cancelTarget, setCancelTarget] =
    React.useState<SnapshotResponse | null>(null);
  const [archiveTarget, setArchiveTarget] =
    React.useState<SnapshotResponse | null>(null);
  const [purgeTarget, setPurgeTarget] = React.useState<SnapshotResponse | null>(
    null
  );

  const [dialogError, setDialogError] = React.useState<string | null>(null);

  // Mutations
  const cancelMutation = useCancelSnapshotMutation(projectId);
  const archiveOrPurgeMutation = useArchiveOrPurgeSnapshotMutation(projectId);

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setDialogError(null);
    try {
      await cancelMutation.mutateAsync(cancelTarget.id);
      setCancelTarget(null);
    } catch (err: unknown) {
      setDialogError(
        extractErrorMessage(err, "Không thể huỷ job tạo Snapshot.")
      );
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    setDialogError(null);
    try {
      await archiveOrPurgeMutation.mutateAsync({
        snapshotId: archiveTarget.id,
        purge: false,
      });
      setArchiveTarget(null);
    } catch (err: unknown) {
      setDialogError(
        extractErrorMessage(err, "Không thể lưu trữ Snapshot.")
      );
    }
  };

  const handleConfirmPurge = async () => {
    if (!purgeTarget) return;
    setDialogError(null);
    try {
      await archiveOrPurgeMutation.mutateAsync({
        snapshotId: purgeTarget.id,
        purge: true,
      });
      setPurgeTarget(null);
    } catch (err: unknown) {
      setDialogError(
        extractErrorMessage(err, "Không thể xoá vĩnh viễn Snapshot.")
      );
    }
  };

  const handleCompareFromCard = (snapshot: SnapshotResponse) => {
    setDiffInitialBaseId(snapshot.id);
    setDiffModalOpen(true);
  };

  const snapshotList = snapshots || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Header */}
      <div className="shadow-xs flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PackageCheck
              className="h-6 w-6 text-blue-600"
              aria-hidden="true"
            />
            <h2 className="text-lg font-bold text-slate-900">
              Bản Đóng Gói Dữ Liệu Bất Biến (Snapshots)
            </h2>
            {isFetching && (
              <RefreshCw
                className="h-3.5 w-3.5 animate-spin text-slate-400"
                aria-label="Đang đồng bộ dữ liệu..."
              />
            )}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Quản lý các bản phát hành tập dữ liệu đã đóng băng, tính toán
            checksum SHA-256, chia tập Train/Val/Test và so sánh phiên bản.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setDiffInitialBaseId(undefined);
              setDiffModalOpen(true);
            }}
            disabled={snapshotList.length < 2}
            title={
              snapshotList.length < 2
                ? "Cần ít nhất 2 snapshot để so sánh"
                : "So sánh 2 snapshot"
            }
          >
            <GitCompare className="mr-1.5 h-4 w-4" aria-hidden="true" />
            So sánh (Diff)
          </Button>

          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Tạo Snapshot Mới
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3 text-xs">
        <span className="mr-2 font-semibold text-slate-600">Trạng thái:</span>
        {[
          { key: "ALL", label: "Tất cả" },
          { key: "READY", label: "Sẵn sàng" },
          { key: "CREATING", label: "Đang tạo" },
          { key: "ARCHIVED", label: "Đã lưu trữ" },
          { key: "FAILED", label: "Thất bại" },
        ].map((tab) => {
          const isSelected = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key as FilterTab)}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${isSelected
                ? "shadow-xs bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error state with retry - strict no mock/hardcode */}
      {error && (
        <Notice
          tone="danger"
          title="Không thể tải danh sách Snapshot từ máy chủ"
        >
          <p className="text-xs text-rose-800">{String(error)}</p>
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Thử lại kết nối
            </Button>
          </div>
        </Notice>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-4" aria-busy="true">
          <div className="h-44 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-44 animate-pulse rounded-xl bg-slate-200" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && snapshotList.length === 0 && (
        <EmptyState
          title="Chưa có Snapshot nào"
          description={
            activeFilter === "ALL"
              ? "Dự án chưa có bản đóng gói dữ liệu bất biến nào. Bấm 'Tạo Snapshot Mới' để đóng gói dataset version và ontology đã publish."
              : `Không tìm thấy Snapshot nào có trạng thái '${activeFilter}'.`
          }
          action={
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Tạo Snapshot đầu tiên
            </Button>
          }
        />
      )}

      {/* Snapshot Cards List */}
      {!isLoading && !error && snapshotList.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {snapshotList.map((snapshot) => (
            <SnapshotCard
              key={snapshot.id}
              snapshot={snapshot}
              isOwner={isOwner}
              onViewManifest={(s) => setManifestSnapshot(s)}
              onViewItems={(s) => setItemsSnapshot(s)}
              onManageTags={(s) => setTagsSnapshot(s)}
              onCompare={handleCompareFromCard}
              onCancel={(s) => {
                setDialogError(null);
                setCancelTarget(s);
              }}
              onArchive={(s) => {
                setDialogError(null);
                setArchiveTarget(s);
              }}
              onPurge={(s) => {
                setDialogError(null);
                setPurgeTarget(s);
              }}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateSnapshotModal
        projectId={projectId}
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Manifest Modal */}
      <SnapshotManifestModal
        projectId={projectId}
        snapshotId={manifestSnapshot?.id || null}
        snapshotVersionName={manifestSnapshot?.version_name}
        open={Boolean(manifestSnapshot)}
        onClose={() => setManifestSnapshot(null)}
      />

      {/* Items Modal */}
      <SnapshotItemsModal
        projectId={projectId}
        snapshotId={itemsSnapshot?.id || null}
        snapshotVersionName={itemsSnapshot?.version_name}
        open={Boolean(itemsSnapshot)}
        onClose={() => setItemsSnapshot(null)}
      />

      {/* Diff Modal */}
      <SnapshotDiffModal
        projectId={projectId}
        snapshots={snapshotList}
        initialBaseId={diffInitialBaseId}
        open={diffModalOpen}
        onClose={() => setDiffModalOpen(false)}
      />

      {/* Tags Modal */}
      <ManageTagsModal
        projectId={projectId}
        snapshot={tagsSnapshot}
        open={Boolean(tagsSnapshot)}
        onClose={() => setTagsSnapshot(null)}
      />

      {/* Confirm Cancel Dialog */}
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Xác nhận huỷ tiến trình tạo Snapshot"
        description={`Bạn có chắc muốn huỷ job đóng gói snapshot "${cancelTarget?.version_name}"? Trạng thái sẽ chuyển thành FAILED với lý do cancelled_by_user.`}
        destructive
        isLoading={cancelMutation.isPending}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
      >
        {dialogError && (
          <Notice tone="danger" title="Lỗi huỷ job" className="mt-3">
            <p className="text-xs text-rose-800">{dialogError}</p>
          </Notice>
        )}
      </ConfirmDialog>

      {/* Confirm Archive Dialog */}
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Lưu trữ Snapshot"
        description={`Bạn có chắc muốn lưu trữ snapshot "${archiveTarget?.version_name}"? Snapshot sẽ được chuyển sang trạng thái ARCHIVED, ngăn chặn các pipeline downstream mới nhưng vẫn giữ dữ liệu và manifest phục vụ đối soát.`}
        isLoading={archiveOrPurgeMutation.isPending}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleConfirmArchive}
      >
        {dialogError && (
          <Notice tone="danger" title="Lỗi lưu trữ" className="mt-3">
            <p className="text-xs text-rose-800">{dialogError}</p>
          </Notice>
        )}
      </ConfirmDialog>

      {/* Confirm Purge Dialog (Owner only) */}
      <ConfirmDialog
        open={Boolean(purgeTarget)}
        title="CẢNH BÁO: Xoá Vĩnh Viễn Snapshot"
        description={`Hành động này KHÔNG THỂ HOÀN TÁC! Toàn bộ snapshot items, siêu dữ liệu và manifest của "${purgeTarget?.version_name}" sẽ bị xoá vĩnh viễn khỏi cơ sở dữ liệu và kho lưu trữ. Chỉ Project Owner mới có quyền này.`}
        destructive
        confirmLabel="Tôi hiểu nguy cơ, hãy Xoá Vĩnh Viễn"
        isLoading={archiveOrPurgeMutation.isPending}
        onClose={() => setPurgeTarget(null)}
        onConfirm={handleConfirmPurge}
      >
        {dialogError && (
          <Notice tone="danger" title="Lỗi xoá vĩnh viễn" className="mt-3">
            <p className="text-xs text-rose-800">{dialogError}</p>
          </Notice>
        )}
      </ConfirmDialog>
    </div>
  );
}
