import { z } from "zod";
import type { Schema } from "@/types/api";

// ---- API contract: generated from backend DTOs ----
export type ProjectMember = Schema<"ProjectMemberResponseDTO">;
export type ProjectMemberRole = ProjectMember["role"];
export type ProjectMemberAddPayload = Schema<"ProjectMemberAddDTO">;
export type ProjectMemberUpdateRolePayload = Schema<"UpdateMemberRoleDTO">;

// ---- Form validation only: the form keeps user_id as a string from the picker ----
export const inviteMemberSchema = z.object({
  user_id: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn người dùng từ danh sách")
    .refine(
      (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0,
      "User ID không hợp lệ"
    ),
  role: z.enum(["admin", "annotator", "reviewer"], {
    message: "Vai trò không hợp lệ",
  }),
});
export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;
