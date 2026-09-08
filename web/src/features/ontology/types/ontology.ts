import { z } from "zod";

export type JsonObject = Record<string, unknown>;
export type VersionStatus = "draft" | "published";
export type InputScope = "ONE_ITEM" | "MANY_ITEMS";
export type JsonFieldType = "string" | "number" | "integer" | "boolean";

export interface InputDefinition {
  id: string;
  code:
    "image" | "tabular" | "video" | "audio" | "document" | "object" | "link";
  name: string;
  description: string | null;
  allowed_formats: string[];
}

export interface OutputDefinition {
  id: string;
  code:
    | "classification"
    | "bounding_box"
    | "polygon"
    | "text"
    | "named_entity"
    | "relation"
    | "number"
    | "custom_object";
  name: string;
  description: string | null;
  supports_categories: boolean;
  default_schema: JsonObject;
}

export interface InputSchema {
  type: InputDefinition["code"];
  allowed_extensions: string[];
  item: JsonObject | null;
}

export interface OntologyInput {
  id: string;
  ontology_id: string;
  definition_id: string;
  name: string;
  description: string | null;
  scope: InputScope;
  input_schema: InputSchema;
  definition: InputDefinition | null;
  locked: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface OntologyOutput {
  id: string;
  ontology_id: string;
  definition_id: string;
  name: string;
  description: string | null;
  multiple: boolean;
  required: boolean;
  value_schema: JsonObject | null;
  definition: OutputDefinition | null;
  locked: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface Category {
  id: string;
  ontology_id: string;
  key: string;
  name: string;
  color: string | null;
  description: string | null;
  locked: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface OntologyVersionInput {
  ontology_version_id: string;
  ontology_input_id: string;
  sort_order: number;
  input: OntologyInput | null;
}

export interface OntologyVersionOutputCategory {
  category_id: string;
  sort_order: number;
  category: Category | null;
}

export interface OntologyVersionOutput {
  ontology_version_id: string;
  ontology_output_id: string;
  ontology_input_id: string;
  sort_order: number;
  output: OntologyOutput | null;
  input: OntologyInput | null;
  categories: OntologyVersionOutputCategory[];
}

export interface OntologyVersion {
  id: string;
  ontology_id: string;
  version_no: number;
  name: string;
  status: VersionStatus;
  based_on_version_id: string | null;
  schema_hash: string | null;
  published_at: string | null;
  inputs: OntologyVersionInput[];
  outputs: OntologyVersionOutput[];
}

export interface Ontology {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  current_version_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  versions: OntologyVersion[];
}

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ExportedOntologySchema {
  ontology_id: string;
  ontology_version_id: string;
  version_no: number;
  version_name: string;
  status: VersionStatus;
  schema_hash: string | null;
  inputs: Array<{
    id: string;
    name: string;
    scope: InputScope;
    schema: InputSchema;
  }>;
  outputs: Array<{
    id: string;
    name: string;
    type: OutputDefinition["code"];
    input_id: string;
    multiple: boolean;
    required: boolean;
    value_schema: JsonObject;
    categories: Array<
      Pick<Category, "id" | "key" | "name" | "color" | "description">
    >;
  }>;
}

export interface SchemaField {
  id: string;
  name: string;
  type: JsonFieldType;
  required: boolean;
}

export interface OntologyInputPayload {
  definition_id: string;
  name: string;
  description?: string;
  scope: InputScope;
  input_schema: InputSchema;
}

export type OntologyInputUpdatePayload = Partial<OntologyInputPayload>;

export interface OntologyOutputPayload {
  definition_id: string;
  name: string;
  description?: string;
  multiple: boolean;
  required: boolean;
  value_schema?: JsonObject | null;
}

export type OntologyOutputUpdatePayload = Partial<OntologyOutputPayload>;

export interface CategoryPayload {
  key: string;
  name: string;
  color?: string;
  description?: string;
}

export type CategoryUpdatePayload = Partial<CategoryPayload>;

export interface OntologyCompositionPayload {
  inputs: Array<{ input_id: string; sort_order: number }>;
  outputs: Array<{
    output_id: string;
    input_id: string;
    category_ids: string[];
    sort_order: number;
  }>;
}

export const keySchema = z
  .string()
  .trim()
  .min(1, "Bắt buộc nhập key.")
  .max(100)
  .regex(/^[a-z][a-z0-9_]*$/, "Dùng chữ thường, số và dấu gạch dưới.");

export const ontologyCreateSchema = z.object({
  name: z.string().trim().min(1, "Bắt buộc nhập tên.").max(255),
  description: z.string().trim().max(2000).optional(),
});

const schemaField = z.object({
  id: z.string(),
  name: keySchema,
  type: z.enum(["string", "number", "integer", "boolean"]),
  required: z.boolean(),
});

export const inputNodeFormSchema = z
  .object({
    definition_id: z.string().min(1, "Chọn loại Input."),
    name: z.string().trim().min(1, "Bắt buộc nhập tên.").max(255),
    description: z.string().trim().max(2000).optional(),
    scope: z.enum(["ONE_ITEM", "MANY_ITEMS"]),
    allowed_extensions: z
      .array(z.string())
      .min(1, "Chọn ít nhất một đuôi file."),
    fields: z.array(schemaField),
  })
  .superRefine((value, context) => {
    if (value.scope === "MANY_ITEMS" && value.fields.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["fields"],
        message: "1 Asset = N Items cần ít nhất một trường mô tả item.",
      });
    }
    const names = value.fields.map((field) => field.name);
    if (names.length !== new Set(names).size) {
      context.addIssue({
        code: "custom",
        path: ["fields"],
        message: "Tên trường item không được trùng.",
      });
    }
  });

export const outputNodeFormSchema = z.object({
  definition_id: z.string().min(1, "Chọn loại Output."),
  name: z.string().trim().min(1, "Bắt buộc nhập tên.").max(255),
  description: z.string().trim().max(2000).optional(),
  multiple: z.boolean(),
  required: z.boolean(),
  fields: z.array(schemaField),
});

export const categoryFormSchema = z.object({
  key: keySchema,
  name: z.string().trim().min(1, "Bắt buộc nhập tên nhãn.").max(255),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Màu phải có dạng #RRGGBB."),
  description: z.string().trim().max(2000).optional(),
});

export type OntologyCreatePayload = z.infer<typeof ontologyCreateSchema>;
export type InputNodeForm = z.infer<typeof inputNodeFormSchema>;
export type OutputNodeForm = z.infer<typeof outputNodeFormSchema>;
export type CategoryForm = z.infer<typeof categoryFormSchema>;

export const PRESET_COLORS = [
  "#2563EB",
  "#F97316",
  "#8B5CF6",
  "#EF4444",
  "#10B981",
  "#0891B2",
];
