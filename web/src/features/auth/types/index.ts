import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập địa chỉ email")
    .email("Định dạng email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginPayload = LoginInput;

export type User = {
  id: number | string;
  name: string;
  email: string;
  status: string;
  avatar_url?: string | null;
  role_names: string[];
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};
