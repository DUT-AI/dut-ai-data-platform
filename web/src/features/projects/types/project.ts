import { z } from "zod";

export const projectTypeSchema = z.enum([
  "detection",
  "ocr",
  "nlp",
  "classification",
  "segmentation",
  "captioning",
]);
export type ProjectType = z.infer<typeof projectTypeSchema>;

export const projectStatusSchema = z.enum(["active", "archived"]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const taskDefinitionVersionSchema = z.object({
  id: z.string(),
  task_definition_id: z.string(),
  version: z.string(),
  input_schema: z.record(z.string(), z.unknown()),
  capability_schema: z.record(z.string(), z.unknown()),
  constraints: z.record(z.string(), z.unknown()).optional(),
  status: z.string(),
  published_at: z.string().nullable().optional(),
});
export type TaskDefinitionVersion = z.infer<typeof taskDefinitionVersionSchema>;

export const projectTemplateVersionSchema = z.object({
  id: z.string(),
  project_template_id: z.string(),
  version: z.string(),
  default_project_configuration: z.record(z.string(), z.unknown()),
  ontology_template_ref: z.string().nullable().optional(),
  status: z.string(),
  providers: z.array(z.string()),
  published_at: z.string().nullable().optional(),
});
export type ProjectTemplateVersion = z.infer<
  typeof projectTemplateVersionSchema
>;

export const projectTemplateSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  task_definition_id: z.string(),
  status: z.string().optional(),
  versions: z.array(projectTemplateVersionSchema),
});
export type ProjectTemplate = z.infer<typeof projectTemplateSchema>;

export const taskDefinitionSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  modality: z.string(),
  status: z.string().optional(),
  versions: z.array(taskDefinitionVersionSchema),
  templates: z.array(projectTemplateSchema),
});
export type TaskDefinition = z.infer<typeof taskDefinitionSchema>;

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  task_definition_version_id: z.string().nullable(),
  project_template_version_id: z.string().nullable(),
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
  task_definition_version_id: z.string().min(1),
  project_template_version_id: z.string().optional(),
  annotation_provider_key: z.string().min(1),
  storage_provider_key: z.string().min(1),
});
export type ProjectCreatePayload = z.infer<typeof createProjectSchema>;
export type CreateProjectFormValues = ProjectCreatePayload;

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
});
export type ProjectUpdatePayload = z.infer<typeof updateProjectSchema>;

export const projectConfigSchema = z.object({
  project_id: z.string(),
  annotation_provider_key: z.string(),
  storage_provider_key: z.string(),
  default_workflow_ref: z.string().nullable(),
  settings: z.record(z.string(), z.unknown()),
  settings_schema_version: z.string(),
});
export type ProjectConfig = z.infer<typeof projectConfigSchema>;

export const PROJECT_TYPE_OPTIONS = [
  {
    value: "detection",
    label: "Object Detection",
    description: "Bounding box",
    badgeColor: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    value: "ocr",
    label: "OCR",
    description: "Region and text",
    badgeColor: "border-blue-200 bg-blue-50 text-blue-700",
  },
  {
    value: "nlp",
    label: "NLP",
    description: "Text processing",
    badgeColor: "border-purple-200 bg-purple-50 text-purple-700",
  },
  {
    value: "classification",
    label: "Classification",
    description: "Single or multiple choice",
    badgeColor: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    value: "segmentation",
    label: "Segmentation",
    description: "Polygon or mask",
    badgeColor: "border-rose-200 bg-rose-50 text-rose-700",
  },
] as const;
