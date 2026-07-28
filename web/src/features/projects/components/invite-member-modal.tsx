"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/components/ui";
import { ProjectMemberRole } from "../types/project";
import { useAddMemberMutation } from "../hooks/use-projects";

interface InviteMemberModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InviteMemberModal({
  projectId,
  isOpen,
  onClose,
}: InviteMemberModalProps) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<Exclude<ProjectMemberRole, "owner">>("annotator");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addMemberMutation = useAddMemberMutation(projectId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    setErrorMsg(null);
    addMemberMutation.mutate(
      { user_id: userId.trim(), role },
      {
        onSuccess: () => {
          setUserId("");
          setRole("annotator");
          onClose();
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { detail?: string } } })?.response
              ?.data?.detail || "Không thể thêm thành viên.";
          setErrorMsg(msg);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mời thành viên vào dự án</DialogTitle>
          <DialogDescription>
            Nhập User ID để phân quyền thành viên tham gia gán nhãn hoặc quản lý dự án.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="p-3 text-xs rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              User ID <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="VD: user_12345 hoặc Email ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Vai trò (Role) <span className="text-rose-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as Exclude<ProjectMemberRole, "owner">)
              }
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="admin">Admin — Quản trị dự án & thành viên</option>
              <option value="annotator">Annotator — Người thực hiện gán nhãn</option>
              <option value="reviewer">Reviewer — Kiểm định & duyệt nhãn</option>
            </select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={addMemberMutation.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" isLoading={addMemberMutation.isPending}>
              Thêm thành viên
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
