import { z } from "zod";
import type { Schema } from "@/types/api";

// ---- API contract: generated from backend DTOs (edit the DTO, then `pnpm sync:api`) ----
export type Project = Schema<"ProjectResponseDTO">;
export type ProjectStatus = Project["status"];
export type ProjectCreatePayload = Schema<"ProjectCreateDTO">;
export type ProjectUpdatePayload = Schema<"ProjectUpdateDTO">;
export type ProjectConfig = Schema<"ProjectConfigurationResponseDTO">;
export type CatalogTemplate = Schema<"ProjectTemplateResponseDTO">;
export type ProjectTemplate = CatalogTemplate;
export type TemplateTool = Schema<"TemplateToolDTO">;
export type TemplateLabel = Schema<"TemplateLabelDTO">;

// ---- Form validation only (UI messages). Its output is passed to createProject(),
// so tsc checks it against ProjectCreatePayload at the call site. ----
export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên dự án")
    .max(255, "Tên dự án không được vượt quá 255 ký tự"),
  description: z
    .string()
    .max(2000, "Mô tả không được vượt quá 2000 ký tự")
    .optional(),
  template_id: z.string().min(1, "Vui lòng chọn mẫu bài toán"),
  storage_provider_key: z.string(),
});
export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;
