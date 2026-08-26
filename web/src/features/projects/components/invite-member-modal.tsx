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
              ?.data?.detail || "Không thể thêm thành viên.";
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm thành viên vào dự án</DialogTitle>
          <DialogDescription>
            Nhập ID người dùng và phân quyền tương ứng cho dự án này.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {errorMsg && (
              <div className="rounded-md bg-rose-50 p-3 text-xs font-medium text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                {errorMsg}
              </div>
            )}

            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User ID / Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="01JN..."
                      disabled={addMemberMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vai trò (Role)</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={addMemberMutation.isPending}
                      className="focus-visible:outline-hidden flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:ring-offset-slate-950"
                    >
                      <option value="annotator">Annotator (Gán nhãn)</option>
                      <option value="reviewer">Reviewer (Kiểm duyệt)</option>
                      <option value="admin">Admin (Quản trị viên)</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={addMemberMutation.isPending}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={addMemberMutation.isPending}>
                {addMemberMutation.isPending
                  ? "Đang thêm..."
                  : "Thêm thành viên"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
