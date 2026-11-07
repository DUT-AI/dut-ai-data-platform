"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  Eye,
  History,
  Layers,
  Loader2,
  Package,
  PenTool,
  Plus,
  Send,
  Square,
  User,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import { Badge, Button, EmptyState } from "@/components/ui";
import { useProjectDatasetsQuery } from "@/features/dataset";
import { useProjectMembersQuery } from "@/features/projects";
import {
  useCreateWorkflowMutation,
  useProjectWorkflowQuery,
  useTransitionMutation,
  useWorkItemsQuery,
} from "../hooks";
import type { WorkItem, WorkItemStatus } from "../types";
import {
  getStatusBadgeVariant,
  getStatusLabel,
} from "./status-helpers";
import { WorkItemHistoryModal } from "./work-item-history-modal";
import { TransitionDialog } from "./transition-dialog";
import { BulkAssignModal } from "./bulk-assign-modal";
import { CreateBatchModal } from "./create-batch-modal";
import { BatchAssetsModal } from "./batch-assets-modal";

interface WorkflowTabViewProps {
  projectId: string;
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch {
    return "";
  }
}

function getDeadlineStatus(
  dateStr?: string | null,
  nowMs: number = Date.now()
): {
  label: string;
  isOverdue: boolean;
  colorClass: string;
} | null {
  if (!dateStr) return null;
  try {
    const target = new Date(dateStr).getTime();
    if (isNaN(target)) return null;

    const diffMs = target - nowMs;
    const isOverdue = diffMs < 0;
    const absDiff = Math.abs(diffMs);

    const diffMins = Math.floor(absDiff / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    const remainingMins = diffMins % 60;

    if (isOverdue) {
      let label = "";
      if (diffDays > 0) {
        label = `Quá hạn ${diffDays} ngày`;
      } else if (diffHours > 0) {
        label = `Quá hạn ${diffHours} giờ${remainingMins > 0 ? ` ${remainingMins}p` : ""}`;
      } else if (diffMins > 0) {
        label = `Quá hạn ${diffMins} phút`;
      } else {
        label = "Vừa hết hạn";
      }
      return {
        label,
        isOverdue: true,
        colorClass: "text-rose-600 bg-rose-50 border-rose-200",
      };
    } else {
      let label = "";
      let colorClass = "";

      if (diffDays > 1) {
        label = `Còn ${diffDays} ngày`;
        colorClass = "text-blue-700 bg-blue-50 border-blue-100";
      } else if (diffDays === 1) {
        label = `Còn 1 ngày${remainingHours > 0 ? ` ${remainingHours}h` : ""}`;
        colorClass = "text-amber-700 bg-amber-50 border-amber-200";
      } else if (diffHours > 0) {
        label = `Còn ${diffHours} giờ${remainingMins > 0 ? ` ${remainingMins}p` : ""}`;
        colorClass = "text-amber-700 bg-amber-50 border-amber-200";
      } else if (diffMins > 0) {
        label = `Còn ${diffMins} phút`;
        colorClass = "text-rose-700 bg-rose-50 border-rose-200 font-semibold";
      } else {
        label = "Sắp hết hạn (< 1p)";
        colorClass = "text-rose-700 bg-rose-50 border-rose-200 font-semibold";
      }

      return {
        label,
        isOverdue: false,
        colorClass,
      };
    }
  } catch {
    return null;
  }
}

function getRoleLabel(role?: string): string {
  switch (role) {
    case "annotator":
      return "Dán nhãn";
    case "reviewer":
      return "Kiểm duyệt";
    case "admin":
      return "Quản trị";
    case "owner":
      return "Chủ sở hữu";
    default:
      return role || "Thành viên";
  }
}

function ReviewActionDropdown({
  onApprove,
  onReject,
  onOptions,
}: {
  onApprove: () => void;
  onReject: () => void;
  onOptions: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-8 gap-1 px-2.5 text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50 shadow-2xs whitespace-nowrap"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span>Duyệt nhanh</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-44 origin-top-right rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onApprove();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Duyệt đạt (Approve)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onReject();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 transition"
          >
            <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>Yêu cầu sửa (Reject)</span>
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOptions();
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-normal text-slate-600 hover:bg-slate-100 transition"
          >
            <span>Tùy chọn khác...</span>
          </button>
        </div>
      )}
    </div>
  );
}

const STATUS_FILTERS: Array<{ key: WorkItemStatus | "ALL"; label: string }> = [
  { key: "ALL", label: "Tất cả" },
  { key: "CREATED", label: "Mới tạo" },
  { key: "ASSIGNED", label: "Đã giao" },
  { key: "IN_PROGRESS", label: "Đang làm" },
  { key: "SUBMITTED", label: "Đã nộp" },
  { key: "IN_REVIEW", label: "Đang duyệt" },
  { key: "APPROVED", label: "Đã duyệt" },
  { key: "REJECTED", label: "Yêu cầu sửa" },
  { key: "COMPLETED", label: "Hoàn thành" },
  { key: "CANCELLED", label: "Đã hủy" },
];

export function WorkflowTabView({ projectId }: WorkflowTabViewProps) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<WorkItemStatus | "ALL">("ALL");
  const [selectedDatasetFilter, setSelectedDatasetFilter] = useState<string>("ALL");
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string>("ALL");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [activeHistoryItemId, setActiveHistoryItemId] = useState<string | null>(null);
  const [transitioningItem, setTransitioningItem] = useState<WorkItem | null>(null);
  const [transitionTarget, setTransitionTarget] = useState<WorkItemStatus | null>(null);
  const [activeAssignItemIds, setActiveAssignItemIds] = useState<string[] | null>(null);
  const [activeBatchForAssets, setActiveBatchForAssets] = useState<WorkItem | null>(null);
  const [showBulkCancelModal, setShowBulkCancelModal] = useState(false);
  const [bulkCancelReason, setBulkCancelReason] = useState("");
  const [isBulkCancelling, setIsBulkCancelling] = useState(false);
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [createdWorkflowId, setCreatedWorkflowId] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());

  // Periodically refresh relative deadline countdown (every 10s)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const { data: projectWorkflow } = useProjectWorkflowQuery(projectId);
  const { data: datasets = [] } = useProjectDatasetsQuery(projectId);
  const { data: members = [] } = useProjectMembersQuery(projectId);
  const createWorkflowMutation = useCreateWorkflowMutation();
  const transitionMutation = useTransitionMutation();

  const handleStartAnnotating = (item: WorkItem) => {
    const meta = (item.metadata || {}) as Record<string, unknown>;
    const assetIds = Array.isArray(meta.asset_ids) ? (meta.asset_ids as string[]) : [];
    const firstAssetId = assetIds[0];
    const datasetVersionId = meta.dataset_version_id as string | undefined;

    if (!firstAssetId) {
      setActiveBatchForAssets(item);
      return;
    }

    // Automatically transition to IN_PROGRESS if currently ASSIGNED
    if (item.status === "ASSIGNED") {
      transitionMutation.mutate({
        workItemId: item.id,
        data: {
          target_status: "IN_PROGRESS",
          comment: "Bắt đầu thực hiện gán nhãn",
        },
      });
    }

    const queryParams = new URLSearchParams();
    if (datasetVersionId) queryParams.set("datasetVersionId", datasetVersionId);
    queryParams.set("workItemId", item.id);
    const targetUrl = `/projects/${projectId}/annotate/${firstAssetId}${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    router.push(targetUrl);
  };

  const memberMap = useMemo(() => {
    const map = new Map<string, (typeof members)[0]>();
    for (const m of members) {
      map.set(String(m.user_id), m);
    }
    return map;
  }, [members]);

  // Create lookup for dataset & version names
  const datasetLookup = useMemo(() => {
    const map = new Map<string, { name: string; versions: Map<string, string> }>();
    for (const d of datasets) {
      const vMap = new Map<string, string>();
      for (const v of d.versions || []) {
        vMap.set(v.id, v.version);
      }
      map.set(d.id, { name: d.name, versions: vMap });
    }
    return map;
  }, [datasets]);

  const getBatchDatasetInfo = (item: WorkItem) => {
    const meta = (item.metadata || {}) as Record<string, unknown>;
    const datasetId = meta.dataset_id as string | undefined;
    const versionId = meta.dataset_version_id as string | undefined;
    const lookup = datasetId ? datasetLookup.get(datasetId) : undefined;
    const datasetName =
      (meta.dataset_name as string) || lookup?.name || "Tập dữ liệu";
    const versionName =
      (meta.dataset_version_name as string) ||
      (versionId ? lookup?.versions.get(versionId) : "") ||
      "";
    return { datasetName, versionName };
  };

  const effectiveWorkflowId =
    projectWorkflow?.id || createdWorkflowId || `wf_${projectId.slice(0, 8)}`;

  const {
    data: workItems = [],
    isLoading,
    refetch,
  } = useWorkItemsQuery({
    project_id: projectId,
    status: selectedStatus === "ALL" ? undefined : selectedStatus,
  });

  // Filter by dataset and assignee
  const filteredWorkItems = useMemo(() => {
    return workItems.filter((item) => {
      const meta = (item.metadata || {}) as Record<string, unknown>;

      // Dataset filter
      if (selectedDatasetFilter !== "ALL") {
        if (meta.dataset_id !== selectedDatasetFilter) return false;
      }

      // Assignee filter
      if (selectedAssigneeFilter !== "ALL") {
        const assigneeId = item.assignee_id ?? (meta.assignee_id as number | undefined);

        if (selectedAssigneeFilter === "UNASSIGNED") {
          if (assigneeId !== null && assigneeId !== undefined) {
            return false;
          }
        } else {
          if (String(assigneeId) !== selectedAssigneeFilter) {
            return false;
          }
        }
      }

      return true;
    });
  }, [workItems, selectedDatasetFilter, selectedAssigneeFilter]);

  const toggleSelectAll = () => {
    if (selectedItemIds.length === filteredWorkItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredWorkItems.map((item) => item.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemIds.length === 0 || isBulkCancelling) return;

    setIsBulkCancelling(true);
    try {
      await Promise.all(
        selectedItemIds.map((workItemId) =>
          transitionMutation.mutateAsync({
            workItemId,
            data: {
              target_status: "CANCELLED",
              comment: bulkCancelReason.trim() || "Hủy hàng loạt theo yêu cầu quản lý",
            },
          })
        )
      );
      setSelectedItemIds([]);
      setShowBulkCancelModal(false);
      setBulkCancelReason("");
      refetch();
    } catch {
      // Error handled
    } finally {
      setIsBulkCancelling(false);
    }
  };

  const ensureWorkflowThenOpenBatch = async () => {
    if (!projectWorkflow?.id && !createdWorkflowId) {
      try {
        const wf = await createWorkflowMutation.mutateAsync({
          project_id: projectId,
          name: "Standard Project Workflow",
          description: "Default labeling & review lifecycle",
        });
        if (wf?.id) {
          setCreatedWorkflowId(wf.id);
        }
      } catch {
        // Handled or will fallback to project workflow on backend
      }
    }
    setShowCreateBatch(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Quy trình & Phân công công việc
          </h2>
          <p className="text-xs text-slate-500">
            Quản lý các gói công việc, điều phối người gán nhãn và kiểm soát luồng xét duyệt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedItemIds.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveAssignItemIds(selectedItemIds)}
                className="gap-1.5 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/50"
              >
                <UserPlus className="h-4 w-4" />
                Giao việc hàng loạt ({selectedItemIds.length})
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBulkCancelModal(true)}
                className="gap-1.5 border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100/60"
              >
                <Ban className="h-4 w-4" />
                Hủy các lô đã chọn ({selectedItemIds.length})
              </Button>
            </>
          )}

          <Button
            size="sm"
            onClick={ensureWorkflowThenOpenBatch}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Tạo Lô công việc
          </Button>
        </div>
      </div>

      {/* Filter Toolbar (Status, Dataset, Assignee) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Trạng thái:</span>
            <div className="relative">
              <select
                aria-label="Lọc theo Trạng thái"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value as WorkItemStatus | "ALL");
                  setSelectedItemIds([]);
                }}
                className="h-8 rounded-lg border border-slate-200 bg-white pl-2.5 pr-7 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.key === "ALL" ? "Tất cả trạng thái" : f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dataset Filter */}
          {datasets.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Tập dữ liệu:</span>
              <div className="relative">
                <select
                  aria-label="Lọc theo Tập dữ liệu"
                  value={selectedDatasetFilter}
                  onChange={(e) => {
                    setSelectedDatasetFilter(e.target.value);
                    setSelectedItemIds([]);
                  }}
                  className="h-8 rounded-lg border border-slate-200 bg-white pl-2.5 pr-7 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="ALL">Tất cả tập dữ liệu ({datasets.length})</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Người phụ trách:</span>
            <div className="relative">
              <select
                aria-label="Lọc theo Người phụ trách"
                value={selectedAssigneeFilter}
                onChange={(e) => {
                  setSelectedAssigneeFilter(e.target.value);
                  setSelectedItemIds([]);
                }}
                className="h-8 rounded-lg border border-slate-200 bg-white pl-2.5 pr-7 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="ALL">Tất cả người phụ trách</option>
                <option value="UNASSIGNED">Chưa phân công (Chưa giao)</option>
                {members.map((m) => (
                  <option key={m.user_id} value={String(m.user_id)}>
                    {m.user_name || m.user_email || `User #${m.user_id}`} ({getRoleLabel(m.role)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Clear Filters Button */}
          {(selectedStatus !== "ALL" || selectedDatasetFilter !== "ALL" || selectedAssigneeFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSelectedStatus("ALL");
                setSelectedDatasetFilter("ALL");
                setSelectedAssigneeFilter("ALL");
                setSelectedItemIds([]);
              }}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium ml-1"
            >
              <X className="h-3 w-3" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        {/* Counter of filtered work items */}
        <div className="text-xs text-slate-500 font-medium shrink-0">
          Hiển thị: <strong className="text-slate-800">{filteredWorkItems.length}</strong> / {workItems.length} lô
        </div>
      </div>

      {/* Work Items Table / List */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : filteredWorkItems.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={
            selectedStatus !== "ALL" || selectedDatasetFilter !== "ALL" || selectedAssigneeFilter !== "ALL"
              ? "Không có lô công việc nào phù hợp với bộ lọc"
              : "Chưa có gói công việc nào"
          }
          description={
            selectedStatus !== "ALL" || selectedDatasetFilter !== "ALL" || selectedAssigneeFilter !== "ALL"
              ? "Hãy điều chỉnh hoặc bấm 'Xóa bộ lọc' để xem toàn bộ danh sách gói công việc."
              : "Dự án chưa khởi tạo gói công việc nào cho quy trình này. Hãy bấm 'Tạo Lô công việc' để tạo các gói dán nhãn thử nghiệm."
          }
          action={
            selectedStatus !== "ALL" || selectedDatasetFilter !== "ALL" || selectedAssigneeFilter !== "ALL" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStatus("ALL");
                  setSelectedDatasetFilter("ALL");
                  setSelectedAssigneeFilter("ALL");
                }}
              >
                Xóa bộ lọc
              </Button>
            ) : (
              <Button size="sm" onClick={ensureWorkflowThenOpenBatch} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Khởi tạo Lô đầu tiên
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[960px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4 w-[28%] whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-slate-600 shrink-0"
                      aria-label="Chọn tất cả"
                    >
                      {selectedItemIds.length === filteredWorkItems.length && filteredWorkItems.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                    <span>Mã Lô & Tập dữ liệu</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 w-[19%] whitespace-nowrap">Người phụ trách</th>
                <th className="py-2.5 px-3 w-[16%] whitespace-nowrap">Hạn chót</th>
                <th className="py-2.5 px-3 w-[10%] text-center whitespace-nowrap">Số asset</th>
                <th className="py-2.5 px-3 w-[10%] text-center whitespace-nowrap">Trạng thái</th>
                <th className="py-2.5 px-4 w-[17%] text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredWorkItems.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);
                const metadata = item.metadata as Record<string, unknown>;
                const itemCount = typeof metadata?.item_count === "number" ? metadata.item_count : undefined;
                const info = getBatchDatasetInfo(item);

                const assigneeId = item.assignee_id ?? (metadata?.assignee_id as number | undefined);
                const assignedMember = assigneeId ? memberMap.get(String(assigneeId)) : undefined;

                const dueDateStr = item.due_date ?? (metadata?.due_date as string | undefined);
                const deadlineStatus = getDeadlineStatus(dueDateStr, currentTime);
                const formattedDue = formatDateTime(dueDateStr);

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isSelected ? "bg-blue-50/30" : "hover:bg-slate-50/50"
                    }`}
                  >
                    {/* Column 1: Batch & Dataset */}
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectItem(item.id)}
                          className="text-slate-400 hover:text-slate-600 shrink-0"
                          aria-label={`Chọn mục ${item.resource_id}`}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                        <div className="min-w-0">
                          {/* Batch title & view asset button */}
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-slate-400 shrink-0" />
                            <button
                              type="button"
                              onClick={() => setActiveBatchForAssets(item)}
                              className="font-mono text-xs font-semibold text-slate-900 hover:text-blue-600 hover:underline flex items-center gap-1.5 truncate"
                              title="Bấm để xem các asset trong lô này"
                            >
                              <span className="truncate">{item.resource_id}</span>
                              <Eye className="h-3 w-3 text-slate-400 shrink-0" />
                            </button>
                          </div>

                          {/* Clean Dataset & Version metadata tags */}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                              <Database className="h-3 w-3 text-slate-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{info.datasetName}</span>
                            </span>
                            {info.versionName && (
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] text-blue-700 whitespace-nowrap">
                                {info.versionName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Assignee */}
                    <td className="px-3 py-3 align-middle whitespace-nowrap">
                      {assignedMember ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs uppercase border border-blue-200">
                            {(assignedMember.user_name || assignedMember.user_email || "U").charAt(0)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span
                              className="text-xs font-semibold text-slate-800 truncate max-w-[160px]"
                              title={assignedMember.user_name || assignedMember.user_email || ""}
                            >
                              {assignedMember.user_name || assignedMember.user_email}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {getRoleLabel(assignedMember.role)}
                            </span>
                          </div>
                        </div>
                      ) : assigneeId ? (
                        <div className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>User #{assigneeId}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Chưa giao</span>
                      )}
                    </td>

                    {/* Column 3: Deadline */}
                    <td className="px-3 py-3 align-middle whitespace-nowrap">
                      {dueDateStr ? (
                        <div className="flex flex-col gap-0.5">
                          {deadlineStatus && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold w-fit whitespace-nowrap ${deadlineStatus.colorClass}`}
                            >
                              {deadlineStatus.isOverdue ? (
                                <AlertCircle className="h-3 w-3 shrink-0" />
                              ) : (
                                <Clock className="h-3 w-3 shrink-0" />
                              )}
                              {deadlineStatus.label}
                            </span>
                          )}
                          <span className="text-[11px] font-medium text-slate-600 whitespace-nowrap">
                            {formattedDue}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Không có hạn</span>
                      )}
                    </td>

                    {/* Column 4: Asset Count */}
                    <td className="px-3 py-3 text-center align-middle whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setActiveBatchForAssets(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition whitespace-nowrap"
                        title="Xem các asset trong lô này"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>{itemCount !== undefined ? itemCount : "?"} assets</span>
                      </button>
                    </td>

                    {/* Column 5: Status */}
                    <td className="px-3 py-3 text-center align-middle whitespace-nowrap">
                      <Badge variant={getStatusBadgeVariant(item.status)} className="whitespace-nowrap">
                        {getStatusLabel(item.status)}
                      </Badge>
                    </td>

                    {/* Column 6: Actions */}
                    <td className="px-4 py-3 text-right align-middle whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveHistoryItemId(item.id)}
                          className="h-8 gap-1 px-2.5 text-xs text-slate-600 whitespace-nowrap"
                          title="Xem nhật ký xử lý"
                        >
                          <History className="h-3.5 w-3.5 shrink-0" />
                          <span>Nhật ký</span>
                        </Button>

                        {item.status === "CREATED" ? (
                          <div className="inline-flex items-center gap-1 whitespace-nowrap">
                            <Button
                              size="sm"
                              onClick={() => setActiveAssignItemIds([item.id])}
                              className="h-8 gap-1 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium whitespace-nowrap"
                            >
                              <UserPlus className="h-3.5 w-3.5 shrink-0" />
                              <span>Giao việc</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTransitioningItem(item)}
                              className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800 shrink-0"
                              title="Tùy chọn (Hủy lô...)"
                            >
                              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                            </Button>
                          </div>
                        ) : item.status === "IN_REVIEW" ? (
                          <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            {/* Inspect annotations */}
                            <Button
                              size="sm"
                              onClick={() => handleStartAnnotating(item)}
                              className="h-8 gap-1.5 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium whitespace-nowrap shadow-xs"
                              title="Soi và kiểm tra các nhãn của lô này"
                            >
                              <Eye className="h-3.5 w-3.5 shrink-0" />
                              <span>Soi nhãn</span>
                            </Button>

                            {/* Compact Review Dropdown (Approve / Reject / Options) */}
                            <ReviewActionDropdown
                              onApprove={() => {
                                setTransitioningItem(item);
                                setTransitionTarget("APPROVED");
                              }}
                              onReject={() => {
                                setTransitioningItem(item);
                                setTransitionTarget("REJECTED");
                              }}
                              onOptions={() => {
                                setTransitioningItem(item);
                                setTransitionTarget(null);
                              }}
                            />
                          </div>
                        ) : item.status === "SUBMITTED" ? (
                          <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Button
                              size="sm"
                              onClick={() => {
                                setTransitioningItem(item);
                                setTransitionTarget("IN_REVIEW");
                              }}
                              className="h-8 gap-1.5 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium whitespace-nowrap shadow-xs"
                              title="Nhận kiểm duyệt lô công việc này"
                            >
                              <Eye className="h-3.5 w-3.5 shrink-0" />
                              <span>Nhận duyệt</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setTransitioningItem(item);
                                setTransitionTarget(null);
                              }}
                              className="h-8 gap-1 px-2.5 text-xs whitespace-nowrap"
                            >
                              <span>Chuyển bước</span>
                              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                            </Button>
                          </div>
                        ) : item.status === "REJECTED" ? (
                          <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Button
                              size="sm"
                              onClick={() => handleStartAnnotating(item)}
                              className="h-8 gap-1.5 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium whitespace-nowrap shadow-xs"
                              title="Tiến hành sửa lại các nhãn theo yêu cầu"
                            >
                              <PenTool className="h-3.5 w-3.5 shrink-0" />
                              <span>Sửa lại nhãn</span>
                            </Button>

                            {/* Direct Re-submit button for Rejected batches */}
                            <Button
                              size="sm"
                              onClick={() => {
                                setTransitioningItem(item);
                                setTransitionTarget("SUBMITTED");
                              }}
                              className="h-8 gap-1.5 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium whitespace-nowrap shadow-xs"
                              title="Nộp lại để kiểm duyệt sau khi đã sửa xong"
                            >
                              <Send className="h-3.5 w-3.5 shrink-0" />
                              <span>Nộp lại</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setTransitioningItem(item);
                                setTransitionTarget(null);
                              }}
                              className="h-8 px-1.5 text-xs text-slate-400 hover:text-slate-700 shrink-0"
                              title="Tùy chọn khác (Phân công lại, Hủy lô...)"
                            >
                              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                            </Button>
                          </div>
                        ) : item.status === "APPROVED" ? (
                          <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Button
                              size="sm"
                              onClick={() => {
                                setTransitioningItem(item);
                                setTransitionTarget("COMPLETED");
                              }}
                              className="h-8 gap-1.5 px-3 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium whitespace-nowrap shadow-xs"
                              title="Chốt đóng hoàn thành lô này"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span>Chốt hoàn thành</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setTransitioningItem(item);
                                setTransitionTarget(null);
                              }}
                              className="h-8 gap-1 px-2.5 text-xs whitespace-nowrap"
                            >
                              <span>Chuyển bước</span>
                              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                            </Button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            {/* Annotate action for assigned/in-progress batches */}
                            {item.status !== "CANCELLED" && (
                              <Button
                                size="sm"
                                onClick={() => handleStartAnnotating(item)}
                                className="h-8 gap-1.5 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium whitespace-nowrap shadow-xs"
                                title="Mở không gian gán nhãn cho lô này"
                              >
                                <PenTool className="h-3.5 w-3.5 shrink-0" />
                                <span>Gán nhãn</span>
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant={item.status === "CANCELLED" ? "outline" : "default"}
                              onClick={() => {
                                setTransitioningItem(item);
                                setTransitionTarget(null);
                              }}
                              disabled={item.status === "COMPLETED"}
                              className="h-8 gap-1 px-2.5 text-xs whitespace-nowrap"
                            >
                              <span>{item.status === "CANCELLED" ? "Khôi phục" : "Chuyển bước"}</span>
                              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals & Dialogs */}
      <WorkItemHistoryModal
        workItemId={activeHistoryItemId}
        members={members}
        onClose={() => setActiveHistoryItemId(null)}
      />

      <TransitionDialog
        workItem={transitioningItem}
        defaultTarget={transitionTarget}
        onClose={() => {
          setTransitioningItem(null);
          setTransitionTarget(null);
          refetch();
        }}
        onOpenAssign={(itemId) => {
          setTransitioningItem(null);
          setTransitionTarget(null);
          setActiveAssignItemIds([itemId]);
        }}
      />

      {activeAssignItemIds && activeAssignItemIds.length > 0 && (
        <BulkAssignModal
          projectId={projectId}
          selectedItemIds={activeAssignItemIds}
          onClose={() => setActiveAssignItemIds(null)}
          onSuccess={() => {
            setActiveAssignItemIds(null);
            setSelectedItemIds([]);
            refetch();
          }}
        />
      )}

      {/* Batch Assets Viewer Modal */}
      {activeBatchForAssets && (
        <BatchAssetsModal
          projectId={projectId}
          workItem={activeBatchForAssets}
          datasetName={getBatchDatasetInfo(activeBatchForAssets).datasetName}
          versionName={getBatchDatasetInfo(activeBatchForAssets).versionName}
          onClose={() => setActiveBatchForAssets(null)}
        />
      )}

      {/* Bulk Cancel Confirmation Modal */}
      {showBulkCancelModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-cancel-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
                <h2 id="bulk-cancel-title" className="text-base font-semibold text-slate-900">
                  Hủy hàng loạt các lô đã chọn
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBulkCancelModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleBulkCancelSubmit} className="mt-4 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn hủy{" "}
                <strong className="text-rose-600 font-semibold">{selectedItemIds.length}</strong> lô
                công việc đã chọn? Các lô này sẽ được chuyển sang trạng thái{" "}
                <strong className="text-slate-800">&apos;Đã hủy&apos;</strong> (bạn vẫn có thể khôi phục
                lại nếu cần).
              </p>

              <div>
                <label
                  htmlFor="bulk-cancel-reason"
                  className="text-xs font-semibold text-slate-700"
                >
                  Lý do hủy (Tùy chọn):
                </label>
                <textarea
                  id="bulk-cancel-reason"
                  rows={2}
                  value={bulkCancelReason}
                  onChange={(e) => setBulkCancelReason(e.target.value)}
                  placeholder="Ví dụ: Chia nhầm lô, dataset cần cập nhật lại..."
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setShowBulkCancelModal(false)}
                  disabled={isBulkCancelling}
                >
                  Không hủy
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={isBulkCancelling}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {isBulkCancelling ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Đang hủy...
                    </>
                  ) : (
                    `Xác nhận hủy ${selectedItemIds.length} lô`
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateBatch && (
        <CreateBatchModal
          projectId={projectId}
          workflowId={effectiveWorkflowId}
          onClose={() => setShowCreateBatch(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
