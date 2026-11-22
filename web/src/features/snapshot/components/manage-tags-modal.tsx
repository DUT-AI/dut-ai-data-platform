"use client";

import * as React from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import { Button, Dialog, DialogContent, Input, Notice } from "@/components/ui";
import { extractErrorMessage } from "../api/snapshot-api";
import {
  useAssignReleaseTagMutation,
  useDeleteReleaseTagMutation,
  useReleaseTagsQuery,
} from "../hooks/use-snapshot";
import type { SnapshotResponse } from "../types";

interface ManageTagsModalProps {
  projectId: string;
  snapshot: SnapshotResponse | null;
  open: boolean;
  onClose: () => void;
}

export function ManageTagsModal({
  projectId,
  snapshot,
  open,
  onClose,
}: ManageTagsModalProps) {
  const [tagName, setTagName] = React.useState("");
  const [actionError, setActionError] = React.useState<string | null>(null);

  const {
    data: allTags,
    isLoading,
    error,
    refetch,
  } = useReleaseTagsQuery(projectId);

  const assignMutation = useAssignReleaseTagMutation(projectId);
  const deleteMutation = useDeleteReleaseTagMutation(projectId);

  if (!snapshot) return null;

  const currentSnapshotTags =
    allTags?.filter((t) => t.snapshot_id === snapshot.id) || [];
  const otherSnapshotTags =
    allTags?.filter((t) => t.snapshot_id !== snapshot.id) || [];

  const handleAssignTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const cleanName = tagName.trim();
    if (!cleanName) return;

    try {
      await assignMutation.mutateAsync({
        snapshotId: snapshot.id,
        name: cleanName,
      });
      setTagName("");
    } catch (err: unknown) {
      const msg = extractErrorMessage(
        err,
        "Không thể gán Release Tag lên Snapshot này."
      );
      setActionError(msg);
    }
  };

  const handleDeleteTag = async (name: string) => {
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(name);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, "Không thể xoá Release Tag này.");
      setActionError(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose} className="max-w-lg">
      <DialogContent onClose={onClose}>
        <div className="space-y-4">
          {/* Header */}
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-sky-600" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-900">
                Quản Lý Release Tags
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Release tag là alias khả biến (mutable alias ví dụ:{" "}
              <code>production</code>, <code>staging</code>) trỏ đến một Snapshot
              cố định để tự động hoá pipeline.
            </p>
          </div>

          {/* Current snapshot info */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs">
            <span className="text-slate-600">Đang chọn Snapshot:</span>
            <span className="font-bold text-slate-900">
              {snapshot.version_name}
            </span>
          </div>

          {/* Error notice */}
          {actionError && (
            <Notice tone="danger" title="Lỗi thao tác">
              <p className="text-xs text-rose-800">{actionError}</p>
            </Notice>
          )}

          {error && (
            <Notice tone="danger" title="Lỗi tải danh sách Release Tags">
              <p className="text-xs text-rose-800">{String(error)}</p>
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  Thử lại
                </Button>
              </div>
            </Notice>
          )}

          {/* Add tag form */}
          <form onSubmit={handleAssignTag} className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="new_tag_name" className="sr-only">
                Tên Release Tag mới
              </label>
              <Input
                id="new_tag_name"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="Nhập tên tag (vd: production, staging...)"
                className="text-xs"
                disabled={assignMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={assignMutation.isPending || !tagName.trim()}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Gán Tag
            </Button>
          </form>

          {/* Tags on this snapshot */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-700">
              Tags trỏ vào Snapshot này ({currentSnapshotTags.length})
            </h3>
            {isLoading && (
              <div className="h-10 animate-pulse rounded bg-slate-200" />
            )}
            {!isLoading && currentSnapshotTags.length === 0 && (
              <p className="text-xs italic text-slate-400">
                Chưa có Release Tag nào trỏ vào snapshot này.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {currentSnapshotTags.map((tag) => (
                <span
                  key={tag.name}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800"
                >
                  <Tag className="h-3 w-3 text-sky-600" />
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleDeleteTag(tag.name)}
                    disabled={deleteMutation.isPending}
                    className="ml-1 text-sky-600 hover:text-rose-600"
                    title="Xoá tag này"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Other tags in project */}
          {otherSnapshotTags.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <h3 className="text-xs font-semibold text-slate-700">
                Các tags khác trong project (trỏ vào snapshot khác)
              </h3>
              <div className="flex flex-wrap gap-2">
                {otherSnapshotTags.map((tag) => (
                  <span
                    key={tag.name}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                  >
                    <span>{tag.name}</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      (ID: {tag.snapshot_id.slice(0, 6)}...)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTagName(tag.name);
                      }}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                      title="Chuyển trỏ tag này về snapshot hiện tại"
                    >
                      Trỏ lại
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end border-t border-slate-100 pt-3">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
