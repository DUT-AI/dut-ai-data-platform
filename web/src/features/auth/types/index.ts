import { z } from "zod";
import type { Schema } from "@/types/api";

// ---- Form validation only (UI messages); its output is sent as LoginPayload ----
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập địa chỉ email")
    .email("Định dạng email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---- API contract: generated from backend DTOs ----
export type LoginPayload = Schema<"LoginRequestDTO">;
export type User = Schema<"AuthUserResponseDTO">;
export type LogoutResponse = Schema<"LogoutResponseDTO">;
