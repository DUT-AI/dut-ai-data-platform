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


export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  project_type: projectTypeSchema,
  owner_id: z.string(),
  status: projectStatusSchema,
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});
export type Project = z.infer<typeof projectSchema>;

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên dự án")
    .max(100, "Tên dự án không được vượt quá 100 ký tự"),
  description: z
    .string()
    .max(500, "Mô tả không được vượt quá 500 ký tự")
    .optional(),
  project_type: projectTypeSchema,
});
export type ProjectCreatePayload = z.infer<typeof createProjectSchema>;
export type CreateProjectFormValues = ProjectCreatePayload;

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: projectStatusSchema.optional(),
});
export type ProjectUpdatePayload = z.infer<typeof updateProjectSchema>;


export const projectConfigSchema = z.object({
  project_id: z.string(),
  settings: z.record(z.string(), z.unknown()),
});
export type ProjectConfig = z.infer<typeof projectConfigSchema>;

export interface ProjectTypeOption {
  value: ProjectType;
  label: string;
  description: string;
  badgeColor: string;
}

export const PROJECT_TYPE_OPTIONS: ProjectTypeOption[] = [
  {
    value: "detection",
    label: "Object Detection",
    description: "Nhận diện và định vị đối tượng bằng Bounding Box",
    badgeColor:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    value: "ocr",
    label: "OCR (Trích xuất văn bản)",
    description: "Nhận dạng chữ viết và trích xuất thông tin từ tài liệu, ảnh",
    badgeColor:
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    value: "nlp",
    label: "NLP / Xử lý ngôn ngữ",
    description:
      "Phân loại văn bản, gán nhãn thực thể (NER), phân tích cảm xúc",
    badgeColor:
      "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  {
    value: "classification",
    label: "Image Classification",
    description: "Phân loại hình ảnh vào các danh mục nhãn khác nhau",
    badgeColor:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    value: "segmentation",
    label: "Image Segmentation",
    description: "Phân vùng điểm ảnh (Pixel-level Mask) đối tượng",
    badgeColor:
      "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  {
    value: "captioning",
    label: "Image Captioning",
    description: "Mô tả tự động nội dung hình ảnh bằng ngôn ngữ tự nhiên",
    badgeColor:
      "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
];
