import { z } from "zod";

export const projectMemberRoleSchema = z.enum([
  "owner",
  "admin",
  "annotator",
  "reviewer",
]);
export type ProjectMemberRole = z.infer<typeof projectMemberRoleSchema>;

export const projectMemberSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  user_id: z.number(),
  user_name: z.string().nullable().optional(),
  user_email: z.string().nullable().optional(),
  user_avatar_url: z.string().nullable().optional(),
  role: projectMemberRoleSchema,
  status: z.string(),
  joined_at: z.string().nullable(),
});

export type ProjectMember = z.infer<typeof projectMemberSchema>;

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
export type ProjectMemberAddPayload = Omit<
  InviteMemberFormValues,
  "user_id"
> & {
  user_id: number;
};
