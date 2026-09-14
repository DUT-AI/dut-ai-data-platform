import type {
  CategoryForm,
  CategoryPayload,
  CategoryUpdatePayload,
  InputDefinition,
  InputNodeForm,
  JsonFieldType,
  JsonObject,
  OntologyInputPayload,
  OntologyOutputPayload,
  OutputDefinition,
  OutputNodeForm,
  SchemaField,
} from "../types";

/* ------------------------------------------------------------------ */
/*  Schema ↔ Fields mappers (single source of truth)                  */
/* ------------------------------------------------------------------ */

/** Convert UI `SchemaField[]` → JSON Schema object for backend. */
export function schemaFieldsToJsonObject(fields: SchemaField[]): JsonObject {
  return {
    type: "object",
    properties: Object.fromEntries(
      fields.map((field) => [field.name, { type: field.type }])
    ),
    required: fields
      .filter((field) => field.required)
      .map((field) => field.name),
  };
}

/** Convert JSON Schema object from backend → UI `SchemaField[]`. */
export function jsonObjectToSchemaFields(
  schema: JsonObject | null
): SchemaField[] {
  if (
    !schema ||
    schema.type !== "object" ||
    typeof schema.properties !== "object"
  ) {
    return [];
  }
  const required = Array.isArray(schema.required) ? schema.required : [];
  return Object.entries(schema.properties as JsonObject).map(
    ([name, value]) => {
      const property = value as JsonObject;
      const type: JsonFieldType = (
        ["string", "number", "integer", "boolean"] as const
      ).includes(String(property.type) as JsonFieldType)
        ? (property.type as JsonFieldType)
        : "string";
      return {
        id: crypto.randomUUID(),
        name,
        type,
        required: required.includes(name),
      };
    }
  );
}

/* ------------------------------------------------------------------ */
/*  Form → Request DTO mappers                                        */
/* ------------------------------------------------------------------ */

/** Map `InputNodeForm` + selected definition → backend payload. */
export function toInputNodeRequest(
  form: InputNodeForm,
  definition: InputDefinition
): OntologyInputPayload {
  return {
    definition_id: definition.id,
    name: form.name.trim(),
    description: form.description?.trim() || undefined,
    scope: form.scope,
    input_schema: {
      type: definition.code,
      allowed_extensions: form.allowed_extensions,
      item:
        form.scope === "ONE_ITEM"
          ? null
          : schemaFieldsToJsonObject(form.fields),
    },
  };
}

/** Map `OutputNodeForm` + selected definition → backend payload. */
export function toOutputNodeRequest(
  form: OutputNodeForm,
  definition: OutputDefinition
): OntologyOutputPayload {
  return {
    definition_id: definition.id,
    name: form.name.trim(),
    description: form.description?.trim() || undefined,
    multiple: form.multiple,
    required: form.required,
    value_schema:
      definition.code === "custom_object"
        ? schemaFieldsToJsonObject(form.fields)
        : undefined,
  };
}

/** Map `CategoryForm` → backend payload (trim description). */
export function toCategoryNodeRequest(form: CategoryForm): CategoryPayload {
  return {
    key: form.key,
    name: form.name,
    color: form.color,
    description: form.description?.trim() || undefined,
  };
}

/** Map `CategoryForm` → backend update payload (trim description). */
export function toCategoryNodeUpdateRequest(
  form: CategoryForm
): CategoryUpdatePayload {
  return {
    key: form.key,
    name: form.name,
    color: form.color,
    description: form.description?.trim() || undefined,
  };
}
