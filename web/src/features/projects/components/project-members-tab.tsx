"use client";

import { useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ProjectMemberRole } from "../types/project";
import {
  useProjectMembersQuery,
  useRemoveMemberMutation,
  useUpdateMemberRoleMutation,
} from "../hooks/use-projects";
import { InviteMemberModal } from "./invite-member-modal";

interface ProjectMembersTabProps {
  projectId: string;
}

export function ProjectMembersTab({ projectId }: ProjectMembersTabProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const { data: members, isLoading } = useProjectMembersQuery(projectId);
  const updateRoleMutation = useUpdateMemberRoleMutation(projectId);
  const removeMemberMutation = useRemoveMemberMutation(projectId);

  const handleRoleChange = (memberId: string, newRole: ProjectMemberRole) => {
    updateRoleMutation.mutate({ memberId, role: newRole });
  };

  const handleRemoveMember = (memberId: string, userId: string) => {
    if (confirm(`Xóa thành viên ID ${userId} khỏi dự án?`)) {
      removeMemberMutation.mutate(memberId);
    }
  };

  const roleBadges: Record<string, { label: string; variant: "default" | "secondary" | "success" | "outline" }> = {
    owner: { label: "OWNER", variant: "default" },
    admin: { label: "ADMIN", variant: "success" },
    annotator: { label: "ANNOTATOR", variant: "secondary" },
    reviewer: { label: "REVIEWER", variant: "outline" },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Thành viên dự án ({members?.length || 0})</CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Quản lý danh sách người dùng và phân quyền hạn tương ứng trong dự án.
            </p>
          </div>
          <Button onClick={() => setIsInviteOpen(true)} size="sm">
            + Mời thành viên
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Đang tải danh sách thành viên...
            </div>
          ) : !members || members.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Chưa có thành viên nào trong dự án.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3">Thành viên (User ID)</th>
                    <th className="px-6 py-3">Vai trò (Role)</th>
                    <th className="px-6 py-3">Trạng thái</th>
                    <th className="px-6 py-3">Ngày tham gia</th>
                    <th className="px-6 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {members.map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                        {m.user_id}
                      </td>
                      <td className="px-6 py-4">
                        {m.role === "owner" ? (
                          <Badge variant={roleBadges[m.role]?.variant || "secondary"}>
                            {roleBadges[m.role]?.label || m.role}
                          </Badge>
                        ) : (
                          <select
                            value={m.role}
                            onChange={(e) =>
                              handleRoleChange(
                                m.id,
                                e.target.value as ProjectMemberRole
                              )
                            }
                            className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                          >
                            <option value="admin">Admin</option>
                            <option value="annotator">Annotator</option>
                            <option value="reviewer">Reviewer</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Hoạt động
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {m.joined_at
                          ? new Date(m.joined_at).toLocaleDateString("vi-VN")
                          : "Gần đây"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {m.role !== "owner" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveMember(m.id, m.user_id)}
                            className="h-7 text-xs px-2.5"
                          >
                            Xóa
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <InviteMemberModal
        projectId={projectId}
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />
    </div>
  );
}
