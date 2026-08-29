"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui";
import {
  ProjectMemberRole,
  inviteMemberSchema,
  InviteMemberFormValues,
} from "../types";
import { useAddMemberMutation } from "../hooks";

interface InviteMemberModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

type InvitableRole = Exclude<ProjectMemberRole, "owner">;

interface RolePreview {
  label: string;
  description: string;
  permissions: string[];
  badgeClass: string;
  iconBg: string;
}

const ROLE_PREVIEWS: Record<InvitableRole, RolePreview> = {
  admin: {
    label: "Admin",
    description: "Quản trị viên dự án",
    badgeClass:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    permissions: [
      "Mời, đổi vai trò và xóa thành viên (trừ Owner)",
      "Cấu hình Project Settings",
      "Tạo & quản lý Ontology, Dataset",
      "Xem và thực hiện Gán nhãn & Kiểm định",
    ],
  },
  annotator: {
    label: "Annotator",
    description: "Người thực hiện gán nhãn",
    badgeClass:
      "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
    permissions: [
      "Xem thông tin dự án và danh sách thành viên",
      "Xem Ontology (danh mục nhãn) và Dataset",
      "Thực hiện gán nhãn (Annotation) dữ liệu được phân công",
    ],
  },
  reviewer: {
    label: "Reviewer",
    description: "Người kiểm định & duyệt nhãn",
    badgeClass:
      "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    permissions: [
      "Xem thông tin dự án và danh sách thành viên",
      "Xem Ontology, Dataset và các bản gán nhãn",
      "Kiểm tra, Duyệt (Approve) hoặc Từ chối (Reject) nhãn",
    ],
  },
};

function CheckCircleIcon({ className }: { className?: string }) {
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
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function InviteMemberModal({
  projectId,
  isOpen,
  onClose,
}: InviteMemberModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const addMemberMutation = useAddMemberMutation(projectId);

  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      user_id: "",
      role: "annotator",
    },
  });

  const selectedRole = (form.watch("role") as InvitableRole) || "annotator";
  const selectedPreview = ROLE_PREVIEWS[selectedRole] || ROLE_PREVIEWS.annotator;

  const onSubmit = (values: InviteMemberFormValues) => {
    setErrorMsg(null);
    addMemberMutation.mutate(
      { user_id: values.user_id.trim(), role: values.role },
      {
        onSuccess: () => {
          form.reset();
          onClose();
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { detail?: string } } })?.response
              ?.data?.detail || "Không thể thêm thành viên. Vui lòng thử lại.";
          setErrorMsg(msg);
        },
      }
    );
  };

  const handleClose = () => {
    form.reset();
    setErrorMsg(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm thành viên vào dự án</DialogTitle>
          <DialogDescription>
            Nhập ID người dùng và chọn vai trò phù hợp để cấp quyền truy cập vào dự án.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Error message */}
            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-600 dark:text-rose-400"
              >
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                {errorMsg}
              </div>
            )}

            {/* User ID input */}
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    User ID <span className="text-rose-500" aria-label="bắt buộc">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="VD: 101, 202"
                      disabled={addMemberMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role select */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Vai trò (Role) <span className="text-rose-500" aria-label="bắt buộc">*</span>
                  </FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={addMemberMutation.isPending}
                      className="focus:ring-primary-500 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="admin">Admin — Quản trị viên dự án</option>
                      <option value="annotator">Annotator — Người thực hiện gán nhãn</option>
                      <option value="reviewer">Reviewer — Người kiểm định & duyệt nhãn</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dynamic Role Preview Card */}
            <div
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40"
              aria-live="polite"
            >
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${selectedPreview.badgeClass}`}
                >
                  {selectedPreview.label}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedPreview.description}
                </span>
              </div>
              <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                Quyền hạn được cấp:
              </p>
              <ul className="space-y-1.5">
                {selectedPreview.permissions.map((perm) => (
                  <li key={perm} className="flex items-start gap-2">
                    <CheckCircleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {perm}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={addMemberMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={addMemberMutation.isPending}
              >
                {addMemberMutation.isPending ? "Đang thêm..." : "Thêm thành viên"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
