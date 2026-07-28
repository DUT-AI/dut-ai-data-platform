export type ProjectType =
  | "detection"
  | "ocr"
  | "nlp"
  | "classification"
  | "segmentation"
  | "captioning";

export type ProjectStatus = "active" | "archived";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  project_type: ProjectType;
  owner_id: string;
  status: ProjectStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProjectCreatePayload {
  name: string;
  description?: string;
  project_type: ProjectType;
}

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
    badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    value: "ocr",
    label: "OCR (Trích xuất văn bản)",
    description: "Nhận dạng chữ viết và trích xuất thông tin từ tài liệu, ảnh",
    badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    value: "nlp",
    label: "NLP / Xử lý ngôn ngữ",
    description: "Phân loại văn bản, gán nhãn thực thể (NER), phân tích cảm xúc",
    badgeColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  {
    value: "classification",
    label: "Image Classification",
    description: "Phân loại hình ảnh vào các danh mục nhãn khác nhau",
    badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    value: "segmentation",
    label: "Image Segmentation",
    description: "Phân vùng điểm ảnh (Pixel-level Mask) đối tượng",
    badgeColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  {
    value: "captioning",
    label: "Image Captioning",
    description: "Mô tả tự động nội dung hình ảnh bằng ngôn ngữ tự nhiên",
    badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
];
