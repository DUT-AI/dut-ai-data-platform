export type AttributeType = "string" | "number" | "boolean" | "enum" | "list";

export type VersionStatus = "draft" | "published" | "archived";

export interface Attribute {
  id: string;
  category_id: string;
  name: string;
  display_name: string | null;
  type: AttributeType;
  required: boolean;
  default_value: string | null;
  allowed_values: string[] | Record<string, unknown> | null;
  description: string | null;
}

export interface Category {
  id: string;
  ontology_version_id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  color: string;
  parent_category_id: string | null;
  sort_order: number;
  attributes: Attribute[];
  children?: Category[];
}

export interface OntologyVersion {
  id: string;
  ontology_id: string;
  version: string;
  status: VersionStatus;
  created_at: string | null;
  published_at: string | null;
  categories: Category[];
}

export interface Ontology {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  versions?: OntologyVersion[];
}

export interface OntologyCreatePayload {
  name: string;
  description?: string;
}

export interface CategoryCreatePayload {
  name: string;
  display_name?: string;
  description?: string;
  color?: string;
  parent_category_id?: string | null;
  sort_order?: number;
}

export interface CategoryUpdatePayload {
  name?: string;
  display_name?: string;
  description?: string;
  color?: string;
  parent_category_id?: string | null;
  sort_order?: number;
}

export interface AttributeCreatePayload {
  name: string;
  display_name?: string;
  type: AttributeType;
  required?: boolean;
  default_value?: string;
  allowed_values?: string[] | Record<string, unknown>;
  description?: string;
}

export interface AttributeUpdatePayload {
  name?: string;
  display_name?: string;
  type?: AttributeType;
  required?: boolean;
  default_value?: string;
  allowed_values?: string[] | Record<string, unknown>;
  description?: string;
}

export const PRESET_COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#64748B", // Slate
];
