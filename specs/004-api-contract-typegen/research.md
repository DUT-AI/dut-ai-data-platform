# Research: API Contract Type Generation

## Verified facts (on `dev` @ 67828a4)

- `app.openapi()` runs offline: importing `apps.api.main` builds the spec without DB, Redis, RabbitMQ or MinIO (70 paths, 88 schemas). The server's spec URL is `/openapi.json` on port 8000, not `/api/v1/openapi.json` on 8001 as in the example script from the task.
- `openapi-typescript@7.13.0` turns that spec into a 5.9k-line `.d.ts` in about 140 ms. `ProjectResponseDTO.created_by` comes out as `number`.
- The helper types in `plan.md` were type-checked against the real generated file with the repo's `tsc`: `ApiResponseOf<"/api/v1/projects">` equals `ProjectResponseDTO[]`, the `post` variant equals `ProjectResponseDTO` (201), and `ApiRequestBodyOf<"/api/v1/projects","post">` equals `ProjectCreateDTO`. A deliberate `string` assignment of `created_by` fails with TS2322, which is the drift detection we want.
- No schema-name collisions and no `-Input`/`-Output` split in the spec, so `Schema<"XxxDTO">` names are stable and readable.
- Zod is never used to parse API responses (`safeParse` appears only in ontology form dialogs). Response zod schemas are therefore pure type duplication.
- The catalog repository returns raw dicts from `modules/project/data/templates.json` with keys `id, title, group, order, image, type, modality, description, tools[{name,desc,type}], labels[{name,color}]`. The existing `ProjectTemplateResponseDTO` lacks `order` and `type`, so adding `response_model` as-is would silently strip them.

## Findings during implementation

| # | Finding | Resolution |
|---|---|---|
| F1 | FastAPI marks every field with a default as optional, also in **response** schemas (32 response schemas were affected, e.g. `UsersListResponseDTO.items?`). Responses always serialize every field (no `response_model_exclude_*` anywhere), so the FE would have been forced to write `?? []` on data that is always present. | `apps/api/openapi.py` marks every property `required` for schemas reachable **only** from 2xx responses. Request schemas keep "default = may be omitted". Proven by a test that compares a real response's keys with the schema. |
| F2 | `openapi-typescript` 7 defaults to `--default-non-nullable true`, which made defaulted **request** fields required (`CreateBatchWorkItemsRequest.priority`). | Scripts pass `--default-non-nullable false`; F1 already handles responses at the source. |
| F3 | Live DB check: 16 `ontology_inputs` rows store `input_schema = {"type": "image"}` with no `allowed_extensions`. They are written by the template seeder (`modules/ontology/services/seeder.py`), not through `InputSchemaDTO`. `ontology-canvas.tsx` calls `.allowed_extensions.join()` on them. | `InputSchemaResponseDTO` keeps `type: str` and defaults `allowed_extensions` to `[]`; regression test added. Fixing the seeder itself is out of scope (reported). |
| F4 | Live DB check of every new response `Literal` (project/member/dataset/version/asset status, roles, selector type, revision source, ontology version status): all rows conform. | Literals kept. |
| F5 | `Asset.download_url` and `rev.created_by.split("@")` in the FE referred to fields that do not exist / have another type. | Fixed at the call sites once tsc reported them. |
| F6 | Pre-existing on `dev` (not caused by this feature): 9 user-id columns are `Integer` in the ORM but `varchar` in the shared dev DB (`projects.owner_id/created_by`, `project_members.user_id`, `user_login_metadata.user_id`, `*.created_by` of datasets, versions, assets, annotations, revisions). Every project-scoped request returns 500 on `dev` against that DB. | Reported; needs a migration. Live tests ran both versions through the same test-only type shim. |

## Decision: where the generator reads the spec

| Option | Verdict | Why |
|---|---|---|
| A. Live URL only (`openapi-typescript http://127.0.0.1:8000/openapi.json`), as in the task | Kept as `generate:api:live` | Convenient while the API is already running, but needs a running server, so it cannot run in a pre-commit hook or on a machine without the backend stack |
| **B. Export to file with Python, generate from file** | **Chosen as default** | Deterministic, no server, works in the hook; same tool and same output as A |
| C. Commit `openapi.json` as the contract | Rejected | A second artifact to keep in sync; the `.d.ts` diff already shows contract changes in review |

## Decision: how the FE consumes the types

| Option | Verdict | Why |
|---|---|---|
| **A. `openapi-typescript` + `Schema<>` aliases, keep axios** | **Chosen** | Smallest change: types only, no runtime change, existing interceptors (401 redirect) untouched |
| B. `openapi-fetch` typed client | Deferred | Typed URLs and params too, but replaces every API wrapper and the axios interceptor; can be layered on later over the same generated file |
| C. `orval` / `openapi-zod-client` (hooks or zod generated) | Rejected | Generates runtime code and React Query hooks; much bigger surface and a new convention for the team |
| D. Pydantic → TS directly (`pydantic-to-typescript`) | Rejected | Loses endpoint paths, needs a Node `json2ts` anyway, less maintained |

## Self-review (objections and decisions)

| # | Objection | Decision |
|---|---|---|
| 1 | YAGNI: the example's `ApiResponseBody` envelope helper is unused here, because the BE returns DTOs unwrapped | **Accept**: dropped |
| 2 | YAGNI: migrate everything at once? | **Accept (scoped)**: infra + `projects` pilot first, then one feature per PR with the same recipe |
| 3 | Failure: `pnpm format` (run by pre-commit) would rewrite the generated file and make the drift check flap | **Accept**: add `web/.prettierignore` and an eslint ignore |
| 4 | Failure: Docker build of `web/` has no Python, so it cannot generate | **Accept**: commit `api.generated.d.ts`; `web/openapi.json` is gitignored |
| 5 | Failure: adding `response_model` to the catalog strips `order`/`type` | **Accept**: extend the DTO with `order`, `type`, typed `tools`/`labels` before adding it |
| 6 | Failure: BE fields typed `str` (e.g. `status`) lose the FE enum | **Accept (pilot only)**: `ProjectResponseDTO.status` becomes `Literal["active","archived"]`; other features tighten their enums when they migrate |
| 7 | Architecture: `openapi-fetch` would also type URLs and params | **Defer**: documented as a follow-up; not needed to remove the duplication |
| 8 | Failure: the hook is not installed for everyone | **Reject as blocker**: the hook is the existing team gate (`make install-hooks`); `pnpm typecheck` still catches usages of stale types |
