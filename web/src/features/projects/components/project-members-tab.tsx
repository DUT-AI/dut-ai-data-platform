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
import { useAuth } from "@/contexts/auth-context";
import { ProjectMember, ProjectMemberRole } from "../types";
import {
  useProjectMembersQuery,
  useRemoveMemberMutation,
  useUpdateMemberRoleMutation,
} from "../hooks";
import { InviteMemberModal } from "./invite-member-modal";
import { RolePermissionsModal } from "./role-permissions-modal";

interface ProjectMembersTabProps {
  projectId: string;
  /** Role của người dùng hiện đang đăng nhập trong project này */
  currentUserRole?: ProjectMemberRole;
}

// ─── Design tokens cho từng vai trò ────────────────────────────────────────
const ROLE_CONFIG: Record<
  ProjectMemberRole,
  {
    label: string;
    badge: "default" | "secondary" | "success" | "outline";
    badgeClass: string;
    ringClass: string;
    avatarClass: string;
  }
> = {
  owner: {
    label: "OWNER",
    badge: "default",
    badgeClass:
      "bg-purple-500/10 text-purple-600 border border-purple-500/20 dark:text-purple-400",
    ringClass: "ring-purple-500/30",
    avatarClass:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  admin: {
    label: "ADMIN",
    badge: "success",
    badgeClass:
      "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400",
    ringClass: "ring-emerald-500/30",
    avatarClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  annotator: {
    label: "ANNOTATOR",
    badge: "secondary",
    badgeClass:
      "bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400",
    ringClass: "ring-blue-500/30",
    avatarClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  reviewer: {
    label: "REVIEWER",
    badge: "outline",
    badgeClass:
      "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400",
    ringClass: "ring-amber-500/30",
    avatarClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
};

const ASSIGNABLE_ROLES: Exclude<ProjectMemberRole, "owner">[] = [
  "admin",
  "annotator",
  "reviewer",
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function getAvatarInitial(userId: string): string {
  return `#${userId.slice(-2).toUpperCase()}`;
}

function canManageMembers(role?: ProjectMemberRole): boolean {
  return role === "owner" || role === "admin";
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function MemberAvatar({
  userId,
  role,
}: {
  userId: string;
  role: ProjectMemberRole;
}) {
  const config = ROLE_CONFIG[role];
  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ${config.ringClass} ${config.avatarClass} text-xs font-bold`}
      aria-hidden="true"
    >
      {getAvatarInitial(userId)}
    </span>
  );
}

function RoleBadge({ role }: { role: ProjectMemberRole }) {
  const config = ROLE_CONFIG[role];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${config.badgeClass}`}
    >
      {config.label}
    </span>
  );
}

function ActiveStatusIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <span
        className="h-1.5 w-1.5 rounded-full bg-emerald-500"
        aria-hidden="true"
      />
      Hoạt động
    </span>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}

// ─── Role select dropdown (inline) ──────────────────────────────────────────
function InlineRoleSelect({
  member,
  onRoleChange,
  isUpdating,
}: {
  member: ProjectMember;
  onRoleChange: (memberId: string, newRole: ProjectMemberRole) => void;
  isUpdating: boolean;
}) {
  return (
    <select
      value={member.role}
      onChange={(e) =>
        onRoleChange(member.id, e.target.value as ProjectMemberRole)
      }
      disabled={isUpdating}
      className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-wait disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      aria-label={`Vai trò của thành viên ${member.user_id}`}
    >
      {ASSIGNABLE_ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_CONFIG[r].label}
        </option>
      ))}
    </select>
  );
}

// ─── Confirm remove dialog ───────────────────────────────────────────────────
function ConfirmRemoveDialog({
  member,
  onConfirm,
  onCancel,
  isLoading,
}: {
  member: ProjectMember;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-remove-title"
        aria-describedby="confirm-remove-desc"
        className="relative z-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
            <TrashIcon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h3
              id="confirm-remove-title"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              Xác nhận xóa thành viên
            </h3>
            <p
              id="confirm-remove-desc"
              className="mt-1 text-xs text-slate-500 dark:text-slate-400"
            >
              Bạn có chắc muốn xóa thành viên{" "}
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                #{member.user_id}
              </span>{" "}
              ra khỏi dự án? Thao tác này không thể hoàn tác.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
          >
            {isLoading ? "Đang xóa..." : "Xóa thành viên"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyMembersState({
  canManage,
  onInvite,
}: {
  canManage: boolean;
  onInvite: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <svg
          className="h-7 w-7 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Chưa có thành viên
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {canManage
            ? 'Bấm "+ Mời thành viên" để thêm người vào dự án.'
            : "Dự án chưa có thành viên nào."}
        </p>
      </div>
      {canManage && (
        <Button onClick={onInvite} size="sm" variant="outline">
          + Mời thành viên
        </Button>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function ProjectMembersTab({
  projectId,
  currentUserRole,
}: ProjectMembersTabProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(
    null
  );

  const { user } = useAuth();
  const { data: members, isLoading } = useProjectMembersQuery(projectId);
  const updateRoleMutation = useUpdateMemberRoleMutation(projectId);
  const removeMemberMutation = useRemoveMemberMutation(projectId);

  // Tự động tìm role của người dùng đang đăng nhập trong project này
  const memberRecord = members?.find(
    (m) => String(m.user_id) === String(user?.id)
  );
  const effectiveRole =
    currentUserRole ?? memberRecord?.role ?? (user ? "owner" : "owner");
  const canManage = canManageMembers(effectiveRole);

  const handleRoleChange = (memberId: string, newRole: ProjectMemberRole) => {
    updateRoleMutation.mutate({ memberId, role: newRole });
  };

  const handleConfirmRemove = () => {
    if (!memberToRemove) return;
    removeMemberMutation.mutate(memberToRemove.id, {
      onSettled: () => setMemberToRemove(null),
    });
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>
                Thành viên dự án{" "}
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-sm font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {members?.length ?? 0}
                </span>
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Quản lý danh sách người dùng và phân quyền hạn tương ứng trong
                dự án.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex shrink-0 items-center gap-2">
              {/* View permissions button (accessible to all) */}
              <button
                type="button"
                onClick={() => setIsPermissionsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label="Xem bảng phân quyền chi tiết"
              >
                <ShieldIcon className="h-3.5 w-3.5" />
                Bảng phân quyền
              </button>

              {/* Invite button (only for owner/admin) */}
              {canManage && (
                <Button
                  onClick={() => setIsInviteOpen(true)}
                  size="sm"
                  aria-label="Mời thành viên mới vào dự án"
                >
                  + Mời thành viên
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Loading state */}
            {isLoading ? (
              <div
                className="space-y-0"
                aria-label="Đang tải danh sách thành viên"
              >
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 border-b border-slate-100 px-6 py-4 last:border-0 dark:border-slate-800"
                  >
                    <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-2.5 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !members || members.length === 0 ? (
              <EmptyMembersState
                canManage={canManage}
                onInvite={() => setIsInviteOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                    <tr>
                      <th scope="col" className="px-6 py-3">
                        Thành viên (User ID)
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Vai trò (Role)
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Trạng thái
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Ngày tham gia
                      </th>
                      {canManage && (
                        <th scope="col" className="px-6 py-3 text-right">
                          Thao tác
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {members.map((m) => (
                      <tr
                        key={m.id}
                        className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/40"
                      >
                        {/* User ID + Avatar */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <MemberAvatar userId={m.user_id} role={m.role} />
                            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                              #{m.user_id}
                            </span>
                          </div>
                        </td>

                        {/* Role — Owner is static badge, others get inline select */}
                        <td className="px-6 py-3.5">
                          {m.role === "owner" || !canManage ? (
                            <RoleBadge role={m.role} />
                          ) : (
                            <InlineRoleSelect
                              member={m}
                              onRoleChange={handleRoleChange}
                              isUpdating={updateRoleMutation.isPending}
                            />
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-3.5">
                          <ActiveStatusIndicator />
                        </td>

                        {/* Joined at */}
                        <td className="px-6 py-3.5 text-xs text-slate-500">
                          {m.joined_at
                            ? new Date(m.joined_at).toLocaleDateString(
                                "vi-VN",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )
                            : "—"}
                        </td>

                        {/* Actions (only for owner/admin, and only for non-owner members) */}
                        {canManage && (
                          <td className="px-6 py-3.5 text-right">
                            {m.role !== "owner" ? (
                              <button
                                type="button"
                                onClick={() => setMemberToRemove(m)}
                                disabled={removeMemberMutation.isPending}
                                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 ring-1 ring-rose-500/30 transition-colors hover:bg-rose-50 hover:ring-rose-500/50 disabled:cursor-wait disabled:opacity-50 dark:text-rose-400 dark:ring-rose-500/20 dark:hover:bg-rose-900/20"
                                aria-label={`Xóa thành viên #${m.user_id} khỏi dự án`}
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                                Xóa
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-600">
                                —
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invite member modal */}
      <InviteMemberModal
        projectId={projectId}
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />

      {/* Role permissions modal */}
      <RolePermissionsModal
        isOpen={isPermissionsOpen}
        onClose={() => setIsPermissionsOpen(false)}
      />

      {/* Confirm remove dialog */}
      {memberToRemove && (
        <ConfirmRemoveDialog
          member={memberToRemove}
          onConfirm={handleConfirmRemove}
          onCancel={() => setMemberToRemove(null)}
          isLoading={removeMemberMutation.isPending}
        />
      )}
    </>
  );
}
