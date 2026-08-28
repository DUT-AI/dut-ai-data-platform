"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLES = [
  {
    role: "owner",
    label: "Owner",
    description: "Chủ dự án",
    badgeClass:
      "bg-purple-500/10 text-purple-600 border border-purple-500/20 dark:text-purple-400",
    headerClass: "text-purple-600 dark:text-purple-400",
  },
  {
    role: "admin",
    label: "Admin",
    description: "Quản trị viên",
    badgeClass:
      "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400",
    headerClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    role: "annotator",
    label: "Annotator",
    description: "Người gán nhãn",
    badgeClass:
      "bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400",
    headerClass: "text-blue-600 dark:text-blue-400",
  },
  {
    role: "reviewer",
    label: "Reviewer",
    description: "Người kiểm duyệt",
    badgeClass:
      "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400",
    headerClass: "text-amber-600 dark:text-amber-400",
  },
] as const;

interface PermissionRow {
  label: string;
  owner: boolean;
  admin: boolean;
  annotator: boolean;
  reviewer: boolean;
}

interface PermissionGroup {
  group: string;
  icon: string;
  rows: PermissionRow[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: "Quản trị Dự án",
    icon: "🏗️",
    rows: [
      {
        label: "Xem thông tin & chi tiết dự án",
        owner: true,
        admin: true,
        annotator: true,
        reviewer: true,
      },
      {
        label: "Chỉnh sửa thông tin dự án",
        owner: true,
        admin: false,
        annotator: false,
        reviewer: false,
      },
      {
        label: "Cấu hình Project Settings",
        owner: true,
        admin: true,
        annotator: false,
        reviewer: false,
      },
      {
        label: "Lưu trữ (Archive) dự án",
        owner: true,
        admin: false,
        annotator: false,
        reviewer: false,
      },
    ],
  },
  {
    group: "Quản lý Thành viên",
    icon: "👥",
    rows: [
      {
        label: "Xem danh sách thành viên",
        owner: true,
        admin: true,
        annotator: true,
        reviewer: true,
      },
      {
        label: "Mời thành viên mới vào dự án",
        owner: true,
        admin: true,
        annotator: false,
        reviewer: false,
      },
      {
        label: "Thay đổi vai trò thành viên",
        owner: true,
        admin: true,
        annotator: false,
        reviewer: false,
      },
      {
        label: "Xóa thành viên khỏi dự án",
        owner: true,
        admin: true,
        annotator: false,
        reviewer: false,
      },
    ],
  },
  {
    group: "Dữ liệu & Bộ nhãn",
    icon: "🗂️",
    rows: [
      {
        label: "Xem Ontology (Danh mục nhãn)",
        owner: true,
        admin: true,
        annotator: true,
        reviewer: true,
      },
      {
        label: "Tạo & Chỉnh sửa Ontology",
        owner: true,
        admin: true,
        annotator: false,
        reviewer: false,
      },
      {
        label: "Xem danh sách Dataset & Assets",
        owner: true,
        admin: true,
        annotator: true,
        reviewer: true,
      },
      {
        label: "Tạo & Quản lý Dataset, tải Assets",
        owner: true,
        admin: true,
        annotator: false,
        reviewer: false,
      },
    ],
  },
  {
    group: "Gán nhãn & Kiểm định",
    icon: "✏️",
    rows: [
      {
        label: "Thực hiện Gán nhãn (Annotation)",
        owner: true,
        admin: true,
        annotator: true,
        reviewer: false,
      },
      {
        label: "Kiểm duyệt & Duyệt nhãn (Review)",
        owner: true,
        admin: true,
        annotator: false,
        reviewer: true,
      },
    ],
  },
];

function CheckIcon() {
  return (
    <svg
      className="mx-auto h-4 w-4 text-emerald-500 dark:text-emerald-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      className="mx-auto h-4 w-4 text-slate-300 dark:text-slate-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export function RolePermissionsModal({
  isOpen,
  onClose,
}: RolePermissionsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Bảng Ma trận Phân quyền
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Tổng hợp các vai trò trong dự án và quyền hạn tương ứng của từng vai trò.
          </DialogDescription>
        </DialogHeader>

        {/* Role legend badges */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
          {ROLES.map((r) => (
            <span
              key={r.role}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${r.badgeClass}`}
            >
              {r.label}
              <span className="font-normal opacity-70">— {r.description}</span>
            </span>
          ))}
        </div>

        {/* Permission Matrix Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60">
                <th className="w-[44%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Quyền hạn
                </th>
                {ROLES.map((r) => (
                  <th
                    key={r.role}
                    className={`px-2 py-3 text-center text-xs font-bold uppercase tracking-wide ${r.headerClass}`}
                  >
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {PERMISSION_GROUPS.map((group, gi) => (
                <React.Fragment key={`perm-group-${gi}`}>
                  {/* Group header row */}
                  <tr
                    key={`group-${gi}`}
                    className="bg-slate-50/60 dark:bg-slate-900/40"
                  >
                    <td
                      colSpan={5}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      <span className="mr-1.5">{group.icon}</span>
                      {group.group}
                    </td>
                  </tr>
                  {/* Permission rows */}
                  {group.rows.map((row, ri) => (
                    <tr
                      key={`row-${gi}-${ri}`}
                      className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                    >
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                        {row.label}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {row.owner ? <CheckIcon /> : <CrossIcon />}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {row.admin ? <CheckIcon /> : <CrossIcon />}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {row.annotator ? <CheckIcon /> : <CrossIcon />}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {row.reviewer ? <CheckIcon /> : <CrossIcon />}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Note footer */}
        <p className="text-xs text-slate-400 dark:text-slate-500">
          * Owner là người tạo dự án và không thể bị xóa khỏi dự án.
          Admin không thể lưu trữ (Archive) hoặc xóa Owner.
        </p>
      </DialogContent>
    </Dialog>
  );
}
