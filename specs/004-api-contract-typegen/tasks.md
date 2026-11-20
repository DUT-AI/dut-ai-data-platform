# Tasks: Single Source of Truth for the API Contract

Run every command from the repository root unless a step says `cd web`.

## Phase 1 — Backend: complete the contract

### T001 Type the template catalog DTO

`modules/project/dtos/project_dtos.py`: replace `ProjectTemplateResponseDTO` with the shape of `modules/project/data/templates.json` (all 69 templates have `id, title, group, order, image, type, modality, description, tools, labels`). Without `order` and `type`, adding `response_model` would strip them from the response.

```python
class TemplateToolDTO(BaseModel):
    name: str
    desc: str | None = None
    type: str


class TemplateLabelDTO(BaseModel):
    name: str
    color: str | None = None


class ProjectTemplateResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    group: str
    order: int | None = None
    image: str | None = None
    type: str | None = None
    modality: str
    description: str | None = None
    tools: list[TemplateToolDTO] = Field(default_factory=list)
    labels: list[TemplateLabelDTO] = Field(default_factory=list)
    default_project_configuration: dict[str, Any] = Field(default_factory=dict)
```

(`name` and `category` are removed: they are not in the catalog and nothing references them.)

### T002 Declare the response models

`apps/api/routers/project_catalog.py`:

```python
from modules.project.dtos.project_dtos import ProjectTemplateResponseDTO

@router.get("/project-templates", response_model=list[ProjectTemplateResponseDTO])
...
@router.get("/project-templates/{template_id}", response_model=ProjectTemplateResponseDTO)
```

### T003 Offline OpenAPI export

New file `apps/api/openapi_export.py`:

```python
"""Write the FastAPI OpenAPI document to a file without starting the server.

Usage: uv run python -m apps.api.openapi_export web/openapi.json
"""

import json
import sys
from pathlib import Path

from apps.api.main import app


def main() -> None:
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "web/openapi.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"OpenAPI written to {target}")


if __name__ == "__main__":
    main()
```

### T004 Contract test

New file `tests/test_project_catalog_contract.py`:

```python
import json

import httpx
import pytest

from apps.api.main import app
from apps.api.openapi_export import main as export_openapi


@pytest.mark.asyncio
async def test_template_catalog_keeps_catalog_fields():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/project-templates")
    assert res.status_code == 200
    templates = res.json()
    assert templates, "catalog must not be empty"
    first = templates[0]
    for key in ("id", "title", "group", "order", "type", "modality", "tools", "labels"):
        assert key in first


def test_every_business_endpoint_declares_a_response_schema(tmp_path, monkeypatch):
    out = tmp_path / "openapi.json"
    monkeypatch.setattr("sys.argv", ["openapi_export", str(out)])
    export_openapi()
    spec = json.loads(out.read_text(encoding="utf-8"))

    untyped = []
    for path, ops in spec["paths"].items():
        if path in ("/health", "/ready"):
            continue
        for method, op in ops.items():
            ok = any(
                code == "204"
                or op["responses"][code].get("content", {}).get("application/json", {}).get("schema")
                for code in op["responses"]
                if code.startswith("2")
            )
            if not ok:
                untyped.append(f"{method.upper()} {path}")
    assert untyped == []
```

Expected: `uv run pytest tests/test_project_catalog_contract.py` → `2 passed`. The second test guards FR-005 for every future endpoint.

## Phase 2 — Frontend: generator and helpers

### T005 Dependency and scripts

```bash
cd web && pnpm add -D openapi-typescript@7.13.0
```

`web/package.json` → `scripts`:

```json
"sync:api": "uv run --directory .. python -m apps.api.openapi_export web/openapi.json && pnpm generate:api",
"generate:api": "openapi-typescript ./openapi.json -o src/types/api.generated.d.ts --default-non-nullable false",
"generate:api:live": "openapi-typescript http://127.0.0.1:8000/openapi.json -o src/types/api.generated.d.ts --default-non-nullable false"
```

`--default-non-nullable false`: otherwise openapi-typescript 7 makes every defaulted **request** field required (research F2). Response fields are made required at the source by `apps/api/openapi.py` (research F1, wired in `apps/api/main.py` with `install_contract_openapi(app)`).

### T006 Makefile target

Add `api-types` to `.PHONY` and the `help` list (`make api-types - Regenerate web API types from backend DTOs`), then:

```make
api-types:
	cd ./$(FRONTEND_DIR) && pnpm sync:api
```

### T007 Ignore rules

- Root `.gitignore`: add `/web/openapi.json`.
- New `web/.prettierignore`:

  ```text
  src/types/api.generated.d.ts
  openapi.json
  ```

- `web/eslint.config.mjs`:

  ```js
  const eslintConfig = [
    { ignores: ["src/types/api.generated.d.ts"] },
    ...nextVitals,
    ...nextTs,
  ];
  ```

### T008 Generate

```bash
make api-types
```

Expected: `✨ openapi-typescript 7.13.0` / `🚀 ./openapi.json → src/types/api.generated.d.ts`; file of about 5.9k lines. Commit it.

### T009 Helpers

New file `web/src/types/api.ts` (verified with `tsc` against the real generated file):

```ts
import type { components, paths } from "./api.generated";

type Schemas = components["schemas"];
type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
type JsonBody<R> = R extends { content: { "application/json": infer B } }
  ? B
  : never;

/**
 * A component schema from the backend OpenAPI document (a Pydantic DTO).
 * @example type Project = Schema<"ProjectResponseDTO">;
 */
export type Schema<T extends keyof Schemas> = Schemas[T];

/** Every endpoint path the backend exposes (keys include the /api/v1 prefix). */
export type ApiPaths = paths;

/**
 * JSON body of the 200 (or 201) response of an endpoint.
 * @example type Projects = ApiResponseOf<"/api/v1/projects">;          // ProjectResponseDTO[]
 * @example type Created = ApiResponseOf<"/api/v1/projects", "post">;   // ProjectResponseDTO
 */
export type ApiResponseOf<
  P extends keyof paths,
  M extends HttpMethod & keyof paths[P] = "get" & keyof paths[P],
> = paths[P][M] extends { responses: infer R }
  ? JsonBody<R[200 & keyof R]> extends never
    ? JsonBody<R[201 & keyof R]>
    : JsonBody<R[200 & keyof R]>
  : never;

/**
 * JSON request body of an endpoint.
 * @example type Payload = ApiRequestBodyOf<"/api/v1/projects", "post">; // ProjectCreateDTO
 */
export type ApiRequestBodyOf<
  P extends keyof paths,
  M extends HttpMethod & keyof paths[P],
> = paths[P][M] extends { requestBody?: infer B }
  ? JsonBody<NonNullable<B>>
  : never;
```

Convention: use `Schema<"XxxDTO">` in feature `types/` files (readable names). Use `ApiResponseOf`/`ApiRequestBodyOf` only where no named DTO exists (e.g. `list[str]` responses).

## Phase 3 — Pilot: migrate the `projects` feature

### T010 Tighten the status enum in the backend

`modules/project/dtos/project_dtos.py`, `ProjectResponseDTO`:

```python
status: Literal["active", "archived"]
```

(The entity only ever sets `"active"` or `"archived"`.) Then run `make api-types`.

### T011 Replace hand-written API shapes

`web/src/features/projects/types/project.ts` becomes:

```ts
import { z } from "zod";
import type { Schema } from "@/types/api";

// ---- API contract: generated from backend DTOs (edit the DTO, then `make api-types`) ----
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
// so tsc already checks it against ProjectCreatePayload at the call site. ----
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
```

Removed (no usage outside this file): `projectStatusSchema`, `templateToolSchema`, `templateLabelSchema`, `catalogTemplateSchema`, `projectSchema`, `updateProjectSchema`, `projectConfigSchema`.

### T012 Fix what tsc reports

```bash
cd web && pnpm typecheck
```

Fix each error at its call site so it matches the backend (for example `created_by`/`owner_id` are now `number`; `description` can be `null`). `project-overview-tab.tsx:95` (`` `User ${project.created_by}` ``) already works with a number. Do not cast to silence errors: an error means the FE was wrong about the API.

Expected at the end: `pnpm typecheck && pnpm lint && pnpm build` exit 0.

## Phase 4 — Rollout recipe for the other features

Once the pilot passes, apply exactly the same recipe in the **same PR** to each of `users`, `auth`, `projects/project_member`, `dataset`, `annotation`, `ontology`, `workflow`:

1. Find the DTO name of each response/request in `web/src/types/api.generated.d.ts` (search for the endpoint path under `paths`, then follow the `$ref` to `components["schemas"]`).
2. Replace the hand-written `interface`/`z.object` with `export type X = Schema<"XxxDTO">`. Keep the exported FE name so call sites do not change.
3. Keep zod schemas used by `zodResolver` or `safeParse` (forms: `login-form`, `invite-member-modal`, ontology node dialogs, `create-ontology-dialog`).
4. If the FE needs a narrower type than the BE declares (e.g. an enum typed `str`), change the DTO to a `Literal`/`Enum` and regenerate. Do not narrow on the FE side.
5. Keep FE-only view models (`ontology-mappers.ts`, canvas/tabular types) hand-written, but type their inputs with `Schema<>`.
6. `pnpm typecheck` and fix every reported line.

Done when: `uv run pytest tests/`, `pnpm typecheck && pnpm lint && pnpm build` pass and the manual browser pass (project overview, create-project wizard, dataset assets, annotation workspace + revision panel, ontology editor, workflow) behaves as before.

Known fix this will force: `web/src/features/annotation/types/annotation.ts:48,62` declares `created_by: string`, but `AnnotationRevisionResponseDTO.created_by` is `integer`. `revision-history-panel.tsx:74` calls `rev.created_by.split("@")[0]`, which throws `TypeError` at runtime today. After migration, render the id (or a resolved user name) instead.

## Phase 5 — Guard against drift

### T013 Pre-commit check

`.githooks/pre-commit`, in `run_web()` right after `pnpm install`:

```bash
        echo "Checking web API types match backend DTOs..."
        pnpm run sync:api || return 1
        if ! git diff --quiet -- src/types/api.generated.d.ts; then
            echo "api.generated.d.ts is out of date: run 'make api-types' (or 'pnpm sync:api' in web/) and stage it."
            return 1
        fi
```

Because the hook regenerates the file, the developer only needs to `git add web/src/types/api.generated.d.ts` and commit again. Reinstall the hook with `make install-hooks`.

Expected: with a DTO edited and the file not regenerated, `git commit` prints `Web Checks: FAILED` and the message above.
