# Implementation Plan: Single Source of Truth for the API Contract

**Branch**: `feat/api-contract-typegen` (from `dev`) | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Decisions

1. **One PR for the whole feature.** First migrate one feature (`projects`) as the pilot to settle the recipe, then apply the same recipe to every other feature in the same PR. The bar is "the app behaves as before": all backend tests, `pnpm typecheck`/`lint`/`build`, and the manual browser pass in the test strategy.

## Open questions

1. Should the drift check also run in CI? There is no CI workflow in the repo today, so the plan only adds it to `.githooks/pre-commit`.

## Summary

Pydantic DTOs in the backend are the only hand-written contract. A small Python entry point dumps `app.openapi()` to `web/openapi.json` without starting the server. `openapi-typescript` turns it into `web/src/types/api.generated.d.ts`, which is committed. `web/src/types/api.ts` exposes `Schema<"XxxDTO">` and endpoint helpers. Feature `types/` files become aliases of the generated schemas, and only zod form schemas stay hand-written. A pre-commit step regenerates the file and blocks a commit if it is stale.

```text
Pydantic DTO (modules/*/dtos, routers' response_model)
        │  uv run python -m apps.api.openapi_export web/openapi.json   (no server needed)
        ▼
web/openapi.json  (gitignored)
        │  pnpm generate:api   (openapi-typescript 7.13.0)
        ▼
web/src/types/api.generated.d.ts  (committed, never hand-edited)
        │  Schema<"ProjectResponseDTO">, ApiResponseOf<"/api/v1/projects">
        ▼
web/src/features/*/types/*.ts  →  api wrappers  →  components   (tsc catches every mismatch)
```

Live mode (the original suggestion) stays available: `pnpm generate:api:live` reads `http://127.0.0.1:8000/openapi.json` from a running server.

**Status**: implemented on `feat/api-contract-typegen`. Full endpoint map: [contracts/endpoint-map.md](./contracts/endpoint-map.md). Implementation findings (F1–F6): [research.md](./research.md#findings-during-implementation).

Commands as implemented: `make api-types`, or without make (Windows): `cd web && pnpm sync:api` (export + generate). `pnpm generate:api` only regenerates from an existing `web/openapi.json`; `pnpm generate:api:live` reads a running server.

## Technical Context

- **Backend**: Python 3.12, FastAPI, Pydantic v2. The OpenAPI URL is `/openapi.json` on port 8000 (routes carry the `/api/v1` prefix).
- **Frontend**: Next.js 16, TypeScript strict, axios (`baseURL` = `.../api/v1`), zod 4 for forms, pnpm 9.15.5.
- **New dependency**: `openapi-typescript@7.13.0` (devDependency only, no runtime code).
- **Constraints**: `web/` builds in Docker with `web/` as the context, so the generated file is committed. No DB migration.

## Phases

| Phase | File | Outcome |
|---|---|---|
| 1 | [tasks.md#phase-1](./tasks.md#phase-1--backend-complete-the-contract) | Catalog endpoints typed; `apps/api/openapi_export.py` |
| 2 | [tasks.md#phase-2](./tasks.md#phase-2--frontend-generator-and-helpers) | Generator, scripts, helpers, prettier/eslint ignore, `make api-types` |
| 3 | [tasks.md#phase-3](./tasks.md#phase-3--pilot-migrate-the-projects-feature) | `projects` feature on generated types |
| 4 | [tasks.md#phase-4](./tasks.md#phase-4--rollout-recipe-for-the-other-features) | Same recipe for users, auth, dataset, annotation, ontology, workflow (fixes `rev.created_by.split`) |
| 5 | [tasks.md#phase-5](./tasks.md#phase-5--guard-against-drift) | Pre-commit drift check |

## File map

| File | Phase | Change |
|---|---|---|
| `modules/project/dtos/project_dtos.py` | 1, 3 | `TemplateToolDTO`, `TemplateLabelDTO`; `ProjectTemplateResponseDTO` matches the catalog; `ProjectResponseDTO.status` → `Literal` |
| `apps/api/routers/project_catalog.py` | 1 | `response_model` on both template endpoints |
| `apps/api/openapi_export.py` | 1 | new |
| `tests/test_project_catalog_contract.py` | 1 | new |
| `Makefile` | 2 | `api-types` target |
| `web/package.json`, `web/pnpm-lock.yaml` | 2 | dev dep + 2 scripts |
| `web/src/types/api.generated.d.ts` | 2 | generated, committed |
| `web/src/types/api.ts` | 2 | new helpers |
| `web/.prettierignore`, `web/eslint.config.mjs`, `.gitignore` | 2 | ignore generated/intermediate files |
| `web/src/features/projects/types/project.ts` | 3 | aliases of generated schemas |
| `web/src/features/*/types/*.ts` (+ call sites tsc flags) | 4 | same recipe |
| `.githooks/pre-commit` | 5 | drift check |

## Test strategy

- Backend: `uv run pytest tests/` (new contract test keeps `order`/`type` on catalog responses and checks that `openapi_export` writes a valid spec).
- Frontend: `pnpm typecheck` is the main test, because the whole point is compile-time detection. Also `pnpm lint` and `pnpm build`.
- Determinism: running `make api-types` twice gives no `git diff`.
- Manual: open a project overview, the create-project wizard (template list and detail) and the annotation revision panel in the browser.

## Acceptance criteria

- [ ] `make api-types` works with the backend stopped and produces no diff on a second run.
- [ ] `GET /api/v1/project-templates` still returns `order` and `type` (contract test).
- [ ] `features/projects/types/project.ts` has no hand-written response/request shape; `pnpm typecheck && pnpm lint && pnpm build` pass.
- [ ] Changing a DTO field without regenerating makes the pre-commit hook fail with the "out of date" message.
- [ ] After Phase 4: `rev.created_by.split(...)` no longer exists (tsc forced the fix).
