import { z } from "zod";

export const projectStatusSchema = z.enum(["active", "archived"]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

// Rich Catalog Template Schema (SSOT from Backend)
export const templateToolSchema = z.object({
  name: z.string(),
  desc: z.string().optional(),
  type: z.string(),
});
export type TemplateTool = z.infer<typeof templateToolSchema>;

export const templateLabelSchema = z.object({
  name: z.string(),
  color: z.string().optional(),
});
export type TemplateLabel = z.infer<typeof templateLabelSchema>;

export const catalogTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  group: z.string(),
  order: z.number().optional(),
  image: z.string().optional(),
  type: z.string().optional(),
  modality: z.string(),
  description: z.string().optional(),
  tools: z.array(templateToolSchema).optional(),
  labels: z.array(templateLabelSchema).optional(),
  default_project_configuration: z.record(z.string(), z.unknown()).optional(),
});
export type CatalogTemplate = z.infer<typeof catalogTemplateSchema>;
export type ProjectTemplate = CatalogTemplate;

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  template_id: z.string().nullable().optional(),
  project_template_version_id: z.string().nullable().optional(),
  created_by: z.string(),
  status: projectStatusSchema,
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  archived_at: z.string().nullable(),
  project_type: z.string().optional(),
  owner_id: z.string().optional(),
});
export type Project = z.infer<typeof projectSchema>;

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
export type ProjectCreatePayload = z.infer<typeof createProjectSchema>;
export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
});
export type ProjectUpdatePayload = z.infer<typeof updateProjectSchema>;

export const projectConfigSchema = z.object({
  project_id: z.string(),
  storage_provider_key: z.string(),
  default_workflow_ref: z.string().nullable().optional(),
  settings: z.record(z.string(), z.unknown()),
  settings_schema_version: z.string(),
});
export type ProjectConfig = z.infer<typeof projectConfigSchema>;
