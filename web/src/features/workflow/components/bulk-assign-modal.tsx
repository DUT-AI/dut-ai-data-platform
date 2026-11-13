"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  Loader2,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { useProjectMembersQuery } from "@/features/projects";
import { useBulkAssignMutation } from "../hooks";

interface BulkAssignModalProps {
  projectId: string;
  selectedItemIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

function getRoleLabel(role: string): string {
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
      return role;
  }
}

export function BulkAssignModal({
  projectId,
  selectedItemIds,
  onClose,
  onSuccess,
}: BulkAssignModalProps) {
  const isSingle = selectedItemIds.length === 1;

  const { data: members = [], isLoading: isLoadingMembers } =
    useProjectMembersQuery(projectId);

  // Selected member user_ids (strings from ProjectMember)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [noDueDate, setNoDueDate] = useState(false);
  const [dueDateError, setDueDateError] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const bulkAssignMutation = useBulkAssignMutation();

  const toDateTimeLocalString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const applyPresetDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(18, 0, 0, 0);
    setDueDate(toDateTimeLocalString(d));
    setNoDueDate(false);
    setDueDateError("");
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isDropdownOpen]);

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return members;
    const term = searchTerm.toLowerCase().trim();
    return members.filter(
      (m) =>
        (m.user_name && m.user_name.toLowerCase().includes(term)) ||
        (m.user_email && m.user_email.toLowerCase().includes(term)) ||
        String(m.user_id).includes(term)
    );
  }, [members, searchTerm]);

  // Annotators list
  const annotatorMembers = useMemo(
    () => members.filter((m) => m.role === "annotator"),
    [members]
  );

  const toggleSelectMember = (userId: string) => {
    if (isSingle) {
      setSelectedUserIds([userId]);
      setIsDropdownOpen(false);
    } else {
      setSelectedUserIds((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    }
  };

  const removeSelectedMember = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
  };

  const selectAllAnnotators = () => {
    const annotatorIds = annotatorMembers.map((m) => String(m.user_id));
    setSelectedUserIds(
      annotatorIds.length > 0
        ? annotatorIds
        : members.map((m) => String(m.user_id))
    );
  };

  const selectAllMembers = () => {
    setSelectedUserIds(members.map((m) => String(m.user_id)));
  };

  const clearSelection = () => {
    setSelectedUserIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const assigneeIds = selectedUserIds
      .map((id) => parseInt(id, 10))
      .filter((n) => !isNaN(n));

    if (assigneeIds.length === 0) return;

    if (!noDueDate && !dueDate) {
      setDueDateError("Vui lòng chọn hạn chót hoàn thành hoặc tích chọn 'Không đặt hạn chót'.");
      return;
    }

    try {
      await bulkAssignMutation.mutateAsync({
        work_item_ids: selectedItemIds,
        assignee_ids: assigneeIds,
        due_date: !noDueDate && dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      onSuccess();
      onClose();
    } catch {
      // Handled by react-query
    }
  };

  const canSubmit = !bulkAssignMutation.isPending && selectedUserIds.length > 0;

  // Selected member objects for chips
  const selectedMemberObjects = useMemo(() => {
    const set = new Set(selectedUserIds);
    return members.filter((m) => set.has(String(m.user_id)));
  }, [members, selectedUserIds]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-assign-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 id="bulk-assign-title" className="text-base font-semibold text-slate-900">
                {isSingle
                  ? "Phân công gói công việc"
                  : `Phân bổ công việc (${selectedItemIds.length} mục đã chọn)`}
              </h2>
              <p className="text-xs text-slate-500">
                {isSingle
                  ? "Tìm kiếm và chọn thành viên trong dự án để giao quyền phụ trách."
                  : "Chọn các thành viên để hệ thống chia đều (Round-Robin) số lượng lô."}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Đóng"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-visible">
          <div className="flex-1 space-y-4 px-6 py-5">
            {/* Quick Actions (for multi-selection) */}
            {!isSingle && members.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 text-xs">
                <span className="font-medium text-slate-600">
                  Đã chọn: <strong className="text-blue-600">{selectedUserIds.length}</strong> /{" "}
                  {members.length} người
                </span>
                <div className="flex items-center gap-1.5">
                  {annotatorMembers.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllAnnotators}
                      className="rounded bg-blue-100 px-2 py-1 font-medium text-blue-700 hover:bg-blue-200 transition"
                    >
                      Chọn {annotatorMembers.length} Annotators
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={selectAllMembers}
                    className="rounded bg-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-300 transition"
                  >
                    Tất cả
                  </button>
                  {selectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="rounded px-2 py-1 text-slate-500 hover:text-slate-800 transition"
                    >
                      Xóa chọn
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Searchable Combobox Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                {isSingle ? "Thành viên phụ trách:" : "Các thành viên nhận việc:"}
              </label>

              {/* Dropdown Trigger Box */}
              <div
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className={`min-h-[42px] w-full cursor-pointer rounded-xl border bg-white p-2 text-xs transition flex flex-wrap items-center justify-between gap-1.5 ${
                  isDropdownOpen
                    ? "border-blue-600 ring-2 ring-blue-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {selectedMemberObjects.length === 0 ? (
                  <span className="text-slate-400 pl-1">
                    {isLoadingMembers
                      ? "Đang tải thành viên..."
                      : "Bấm để tìm và chọn thành viên..."}
                  </span>
                ) : isSingle ? (
                  <div className="flex items-center gap-2 pl-1">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-[11px] uppercase">
                      {(selectedMemberObjects[0].user_name || "U").charAt(0)}
                    </div>
                    <span className="font-semibold text-slate-800">
                      {selectedMemberObjects[0].user_name || selectedMemberObjects[0].user_email}
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0">
                      {getRoleLabel(selectedMemberObjects[0].role)}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {selectedMemberObjects.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800 border border-blue-100"
                      >
                        {m.user_name || m.user_email}
                        <button
                          type="button"
                          onClick={(e) => removeSelectedMember(String(m.user_id), e)}
                          className="text-blue-500 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1 text-slate-400 pr-1 shrink-0 ml-auto">
                  {selectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearSelection();
                      }}
                      className="hover:text-slate-600 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isDropdownOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in-0 zoom-in-95">
                  {/* Search input header */}
                  <div className="border-b border-slate-100 p-2.5">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Gõ tên hoặc email để tìm..."
                        className="w-full rounded-lg bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 border border-slate-200"
                      />
                    </div>
                  </div>

                  {/* Member options list */}
                  <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                    {isLoadingMembers ? (
                      <div className="flex items-center justify-center py-6 text-slate-400 text-xs">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600 mr-2" />
                        Đang tải...
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        {searchTerm ? "Không tìm thấy thành viên nào phù hợp." : "Chưa có thành viên nào trong dự án."}
                      </div>
                    ) : (
                      filteredMembers.map((member) => {
                        const isSelected = selectedUserIds.includes(String(member.user_id));
                        const displayName = member.user_name || member.user_email || `User #${member.user_id}`;
                        const initial = displayName.charAt(0).toUpperCase();

                        return (
                          <div
                            key={member.id}
                            onClick={() => toggleSelectMember(String(member.user_id))}
                            className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                              isSelected
                                ? "bg-blue-50 text-blue-900 font-medium"
                                : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700 text-xs uppercase">
                                {initial}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-900 leading-tight">
                                  {displayName}
                                </span>
                                {member.user_email && (
                                  <span className="text-[11px] text-slate-400">
                                    {member.user_email}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] py-0 font-normal">
                                {getRoleLabel(member.role)}
                              </Badge>
                              {isSelected ? (
                                <Check className="h-4 w-4 text-blue-600 shrink-0" />
                              ) : !isSingle ? (
                                <div className="h-4 w-4 rounded border border-slate-300" />
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Due date picker & quick presets */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="due-date-input"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                >
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Hạn chót hoàn thành: {!noDueDate && <span className="text-rose-500">*</span>}
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer hover:text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={noDueDate}
                    onChange={(e) => {
                      setNoDueDate(e.target.checked);
                      if (e.target.checked) {
                        setDueDate("");
                        setDueDateError("");
                      }
                    }}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Không đặt hạn chót</span>
                </label>
              </div>

              {!noDueDate && (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Chọn nhanh:</span>
                    <button
                      type="button"
                      onClick={() => applyPresetDays(1)}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      +24 giờ (1 ngày)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetDays(3)}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      +3 ngày
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetDays(7)}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      +7 ngày (1 tuần)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetDays(14)}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      +14 ngày (2 tuần)
                    </button>
                  </div>

                  <input
                    id="due-date-input"
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      setDueDateError("");
                    }}
                    className={`w-full rounded-lg border p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 ${
                      dueDateError
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500"
                        : "border-slate-200 focus:border-blue-600 focus:ring-blue-600"
                    }`}
                  />
                </>
              )}

              {dueDateError && (
                <p className="text-[11px] font-medium text-rose-600">{dueDateError}</p>
              )}
            </div>

            {bulkAssignMutation.isError && (
              <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">
                {(bulkAssignMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
                  "Có lỗi xảy ra khi phân công công việc."}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-3">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Hủy
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={!canSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {bulkAssignMutation.isPending ? "Đang phân công..." : "Xác nhận giao việc"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
