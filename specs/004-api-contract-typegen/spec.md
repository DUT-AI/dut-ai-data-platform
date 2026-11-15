# Feature Specification: Single Source of Truth for the API Contract (BE → FE type generation)

**Feature Branch**: `feat/api-contract-typegen`
**Created**: 2026-11-15
**Status**: Draft
**Input**: The backend (FastAPI/Pydantic) and the frontend (Next.js) each hand-write the request/response shapes of the same API. Every change to an input or output must be made twice, and the two copies drift. Make the backend the single source of truth and generate the frontend types from it with `openapi-typescript`.

## Problem (evidence from `dev` @ 67828a4)

| Endpoint field | Backend (Pydantic → OpenAPI) | Frontend (hand-written) | Effect |
|---|---|---|---|
| `ProjectResponseDTO.created_by`, `owner_id` | `int` | `z.string()` / `string` (`web/src/features/projects/types/project.ts`) | wrong type, `tsc` silent |
| `AnnotationRevisionResponseDTO.created_by` | `int` | `string` (`web/src/features/annotation/types/annotation.ts:48,62`) | `revision-history-panel.tsx:74` calls `rev.created_by.split("@")`, so it throws at runtime on a number |
| `GET /project-templates`, `GET /project-templates/{id}` | no `response_model` (untyped in OpenAPI) | hand-written `CatalogTemplate` | the contract cannot be generated |

Measured on the current spec: 103 operations, 99 have a typed 2xx JSON response. The only untyped business endpoints are the two catalog endpoints above (`/health`, `/ready` are probes).

## User Scenarios & Testing

### User Story 1: Change a DTO once (Priority: P1)

A backend developer adds, renames or retypes a field in a Pydantic DTO, runs one command, and the frontend types update. `pnpm typecheck` then points to every frontend line that no longer matches.

**Independent Test**: change `ProjectResponseDTO.status` to `Literal["active", "archived"]`, run `make api-types`, and `web/src/types/api.generated.d.ts` shows `status: "active" | "archived"` with no manual FE edit.

**Acceptance Scenarios**:

1. **Given** a DTO field changes type, **When** `make api-types` runs, **Then** the generated file changes and `pnpm typecheck` fails at each FE usage that relied on the old type.
2. **Given** no backend change, **When** `make api-types` runs twice, **Then** the generated file is byte-identical (deterministic output).

### User Story 2: Frontend types come from the generated file (Priority: P1)

A frontend developer types API calls with `Schema<"ProjectResponseDTO">` (or `ApiResponseOf<"/api/v1/projects">`) instead of re-declaring the shape.

**Acceptance Scenarios**:

1. **Given** the `projects` feature after migration, **When** you read `features/projects/types/project.ts`, **Then** every API request/response type is an alias of the generated schema, and only form-validation zod schemas remain hand-written.
2. **Given** the migrated features, **When** `pnpm typecheck` runs, **Then** it passes, and the `created_by` mismatches above are fixed at compile time.

### User Story 3: Drift cannot be committed silently (Priority: P2)

**Acceptance Scenario**: **Given** a developer changed a DTO but did not regenerate, **When** the pre-commit hook runs, **Then** the commit is rejected with "api.generated.d.ts is out of date: run `make api-types` and stage it".

### Edge Cases

- The generated file must not be reformatted by `pnpm format` or linted by `eslint`, or the drift check would see false diffs.
- `web/` builds in Docker with only `web/` as the context, so the generated `.d.ts` must be committed (the Python backend is not available there).
- Paths in the generated `paths` type include the `/api/v1` prefix, while `axios` `baseURL` already ends in `/api/v1`. Helpers take the full OpenAPI path; the call sites stay unchanged.
- Error responses use the `{ error: { code, message, details } }` envelope from `core/exceptions/handlers.py`, which is not in OpenAPI. They are out of scope (see Out of Scope).

## Requirements

### Functional Requirements

- **FR-001**: The backend MUST be able to write its OpenAPI document to a file without starting the server or connecting to any service (`uv run python -m apps.api.openapi_export <file>`).
- **FR-002**: `web/package.json` MUST expose `generate:api` (from the exported file) and `generate:api:live` (from a running server at `http://127.0.0.1:8000/openapi.json`), both writing `web/src/types/api.generated.d.ts` with `openapi-typescript` pinned to `7.13.0`.
- **FR-003**: `make api-types` MUST run export + generate in one step.
- **FR-004**: `web/src/types/api.ts` MUST export `Schema<Name>`, `ApiPaths`, `ApiResponseOf<Path, Method>` and `ApiRequestBodyOf<Path, Method>`.
- **FR-005**: Every business endpoint MUST declare its response model so it appears in OpenAPI; in this feature that means the two project-catalog endpoints.
- **FR-006**: Frontend API request/response types MUST be aliases of generated schemas. Zod schemas stay only for form validation (they carry UI messages and are not used to parse responses anywhere in `web/src`).
- **FR-007**: The pre-commit hook MUST regenerate the types and fail when the committed file differs.

### Out of Scope

- A typed HTTP client (`openapi-fetch`) replacing `axios`. That is a later step if wanted; it is not needed to remove duplication.
- Generating zod schemas from OpenAPI (runtime validation of responses). The FE does not validate responses today.
- Documenting the error envelope in OpenAPI.
- A success envelope helper (`ApiResponse<T>`). This backend returns DTOs unwrapped, so the helper has nothing to wrap.

## Success Criteria

- **SC-001**: Changing a response/request field needs exactly one hand edit (the Pydantic DTO) plus `make api-types`.
- **SC-002**: After full rollout, `grep -rn "z.object" web/src/features/*/types` returns only form schemas.
- **SC-003**: `pnpm typecheck`, `pnpm lint`, `pnpm build` and `uv run pytest tests/` pass.
