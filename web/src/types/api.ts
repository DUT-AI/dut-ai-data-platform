/**
 * API contract helpers over the types generated from the backend OpenAPI document.
 *
 * The backend Pydantic DTOs are the single source of truth. Never re-declare an
 * API request/response shape by hand: change the DTO, then run `pnpm sync:api`
 * (or `make api-types`) and let `pnpm typecheck` point at what must change.
 */
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
 * @example type Projects = ApiResponseOf<"/api/v1/projects">; // ProjectResponseDTO[]
 * @example type Created = ApiResponseOf<"/api/v1/projects", "post">; // ProjectResponseDTO
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
 * Query parameters of an endpoint.
 * @example type WorkItemQuery = ApiQueryOf<"/api/v1/work-items">;
 */
export type ApiQueryOf<
  P extends keyof paths,
  M extends HttpMethod & keyof paths[P] = "get" & keyof paths[P],
> = paths[P][M] extends { parameters: { query?: infer Q } }
  ? NonNullable<Q>
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
