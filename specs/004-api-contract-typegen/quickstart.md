# Quickstart: API types generated from the backend

## Daily workflow

1. Change the Pydantic DTO (or a router's `response_model`) in the backend.
2. Regenerate the frontend types (the backend server does **not** need to be running):

   ```bash
   make api-types          # or, without make (Windows): cd web && pnpm sync:api
   ```

   If the API is already running locally you can also use `cd web && pnpm generate:api:live`.
3. `cd web && pnpm typecheck` and fix every line it reports.
4. Commit the DTO change **and** `web/src/types/api.generated.d.ts` together.

## Using the types in the frontend

```ts
import type { Schema, ApiResponseOf } from "@/types/api";

export type Project = Schema<"ProjectResponseDTO">;
export type ProjectCreatePayload = Schema<"ProjectCreateDTO">;
type TemplateGroups = ApiResponseOf<"/api/v1/project-template-groups">; // string[]
```

## Rules

- Never edit `web/src/types/api.generated.d.ts` by hand.
- Do not re-declare an API shape with `interface` or `z.object`. Zod is for form validation only.
- If the FE needs a stricter type (an enum, a non-null field), fix the DTO and regenerate.
- Every new endpoint declares `response_model` (or a return annotation); `tests/test_project_catalog_contract.py` fails otherwise.
