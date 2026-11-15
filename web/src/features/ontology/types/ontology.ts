import { z } from "zod";
import type { Schema } from "@/types/api";

export type JsonObject = Record<string, unknown>;
export type JsonFieldType = "string" | "number" | "integer" | "boolean";

// ---- API contract: generated from backend DTOs ----
/** `code` is open-ended: the catalog is seeded but new definitions may be added. */
export type InputDefinition = Schema<"InputDefinitionResponseDTO">;
export type OutputDefinition = Schema<"OutputDefinitionResponseDTO">;

/** Stored schema as served (seeded inputs may carry only `type`). */
export type InputSchema = Schema<"InputSchemaResponseDTO">;
/** The types the backend accepts when an input is created or updated. */
export type InputSchemaType = Schema<"InputSchemaDTO">["type"];
export type OntologyInput = Schema<"OntologyInputResponseDTO">;
export type InputScope = OntologyInput["scope"];
export type OntologyOutput = Schema<"OntologyOutputResponseDTO">;
export type Category = Schema<"CategoryResponseDTO">;

export type OntologyVersionInput = Schema<"OntologyVersionInputResponseDTO">;
export type OntologyVersionOutputCategory =
  Schema<"OntologyVersionOutputCategoryResponseDTO">;
export type OntologyVersionOutput = Schema<"OntologyVersionOutputResponseDTO">;
export type OntologyVersion = Schema<"OntologyVersionResponseDTO">;
export type VersionStatus = OntologyVersion["status"];
export type Ontology = Schema<"OntologyResponseDTO">;

export type ValidationIssue = Schema<"ValidationIssueDTO">;
export type ValidationResult = Schema<"OntologyValidationResponseDTO">;
export type ExportedOntologySchema = Schema<"OntologyVersionSchemaResponseDTO">;

export type OntologyUpdatePayload = Schema<"OntologyUpdateDTO">;
export type OntologyInputPayload = Schema<"OntologyInputCreateDTO">;
export type OntologyInputUpdatePayload = Schema<"OntologyInputUpdateDTO">;
export type OntologyOutputPayload = Schema<"OntologyOutputCreateDTO">;
export type OntologyOutputUpdatePayload = Schema<"OntologyOutputUpdateDTO">;
export type CategoryPayload = Schema<"CategoryCreateDTO">;
export type CategoryUpdatePayload = Schema<"CategoryUpdateDTO">;
export type OntologyVersionCreatePayload = Schema<"OntologyVersionCreateDTO">;
export type OntologyCompositionPayload = Schema<"OntologyCompositionUpdateDTO">;

// ---- FE-only: the schema-field builder rows used by the node dialogs ----
export interface SchemaField {
  id: string;
  name: string;
  type: JsonFieldType;
  required: boolean;
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
