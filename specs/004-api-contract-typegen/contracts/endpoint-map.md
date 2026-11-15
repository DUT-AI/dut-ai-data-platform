# Contract: Endpoint → DTO → Frontend type

Every business endpoint of the API (101 operations, `/health` and `/ready` excluded), the backend DTO that defines it, and the frontend type that now aliases it. Request and response DTOs live in `modules/*/dtos` (workflow: `modules/workflow/application/dtos`). Frontend aliases live in `web/src/features/*/types` and all resolve through `Schema<"…">` from `web/src/types/api.ts`.

Legend: `→` response (status code), `⇐` request body, `—` no body. `[]` means a list.

## Auth (`/api/v1/auth`) — `features/auth`

| Method | Path | Request | Response | FE type |
|---|---|---|---|---|
| POST | `/auth/login` | ⇐ `LoginRequestDTO` | → 200 `TokenResponseDTO` | `LoginPayload`, `TokenResponse` |
| GET | `/auth/me` | — | → 200 `AuthUserResponseDTO` | `User` |
| POST | `/auth/logout` | — | → 200 `LogoutResponseDTO` | `LogoutResponse` |

## Users — `features/users`

| Method | Path | Request | Response | FE type |
|---|---|---|---|---|
| GET | `/users` | query `page, page_size, search` | → 200 `UsersListResponseDTO` (`items: UserReadDTO[]`) | `UsersListResponse`, `UserRead` |

## Projects — `features/projects`

| Method | Path | Request | Response | FE type |
|---|---|---|---|---|
| POST | `/projects` | ⇐ `ProjectCreateDTO` | → 201 `ProjectResponseDTO` | `ProjectCreatePayload`, `Project` |
| GET | `/projects` | query `status, page, page_size, search, sort_by, sort_order` | → 200 `ProjectResponseDTO[]` | `Project[]` |
| GET | `/projects/{project_id}` | — | → 200 `ProjectResponseDTO` | `Project` |
| PUT / PATCH | `/projects/{project_id}` | ⇐ `ProjectUpdateDTO` | → 200 `ProjectResponseDTO` | `ProjectUpdatePayload` |
| DELETE | `/projects/{project_id}` | — | → 200 `ProjectResponseDTO` | `Project` |
| POST | `/projects/{project_id}/archive` | — | → 200 `ProjectResponseDTO` | `Project` |
| POST | `/projects/{project_id}/restore` | — | → 200 `ProjectResponseDTO` | `Project` |
| GET | `/projects/{project_id}/members` | — | → 200 `ProjectMemberResponseDTO[]` | `ProjectMember[]` |
| POST | `/projects/{project_id}/members` | ⇐ `ProjectMemberAddDTO` | → 201 `ProjectMemberResponseDTO` | `ProjectMemberAddPayload` |
| PUT | `/projects/{project_id}/members/{user_id}` | ⇐ `UpdateMemberRoleDTO` | → 200 `ProjectMemberResponseDTO` | `ProjectMemberUpdateRolePayload` |
| DELETE | `/projects/{project_id}/members/{user_id}` | — | → 204 | — |
| GET | `/projects/{project_id}/config` | — | → 200 `ProjectConfigurationResponseDTO` | `ProjectConfig` |
| PUT | `/projects/{project_id}/config` | ⇐ free-form settings object | → 200 `ProjectConfigurationResponseDTO` | `ProjectConfig` |
| GET | `/projects/{project_id}/configuration` | — | → 200 `ProjectConfigurationResponseDTO` | `ProjectConfig` |
| PATCH | `/projects/{project_id}/configuration` | ⇐ `UpdateConfigurationDTO` | → 200 `ProjectConfigurationResponseDTO` | — (not called by FE) |
| GET | `/project-template-groups` | — | → 200 `string[]` | `string[]` |
| GET | `/project-templates` | query `group, modality, search` | → 200 `ProjectTemplateResponseDTO[]` **(newly typed)** | `CatalogTemplate[]` |
| GET | `/project-templates/{template_id}` | — | → 200 `ProjectTemplateResponseDTO` **(newly typed)** | `CatalogTemplate` |

## Ontology — `features/ontology`

| Method | Path | Request | Response | FE type |
|---|---|---|---|---|
| GET | `/projects/{project_id}/ontology` | — | → 200 `OntologyResponseDTO` | `Ontology` |
| GET / POST | `/projects/{project_id}/ontologies` | ⇐ `OntologyCreateDTO` (POST) | → 200 `OntologyResponseDTO[]` / 201 `OntologyResponseDTO` | `Ontology`, `OntologyCreatePayload` (form) |
| GET / PATCH / DELETE | `/projects/{project_id}/ontologies/{ontology_id}` | ⇐ `OntologyUpdateDTO` (PATCH) | → 200 `OntologyResponseDTO` / 204 | `Ontology`, `OntologyUpdatePayload` |
| GET / POST | `/ontology-definitions/inputs` | ⇐ `InputDefinitionCreateDTO` | → `InputDefinitionResponseDTO[]` / 201 | `InputDefinition` |
| GET / PATCH / DELETE | `/ontology-definitions/inputs/{definition_id}` | ⇐ `InputDefinitionUpdateDTO` | → `InputDefinitionResponseDTO` / 204 | `InputDefinition` |
| GET / POST | `/ontology-definitions/outputs` | ⇐ `OutputDefinitionCreateDTO` | → `OutputDefinitionResponseDTO[]` / 201 | `OutputDefinition` |
| GET / PATCH / DELETE | `/ontology-definitions/outputs/{definition_id}` | ⇐ `OutputDefinitionUpdateDTO` | → `OutputDefinitionResponseDTO` / 204 | `OutputDefinition` |
| GET / POST | `…/ontologies/{ontology_id}/inputs` | ⇐ `OntologyInputCreateDTO` | → `OntologyInputResponseDTO[]` / 201 | `OntologyInput`, `OntologyInputPayload` |
| GET / PATCH / DELETE | `…/inputs/{input_id}` | ⇐ `OntologyInputUpdateDTO` | → `OntologyInputResponseDTO` / 204 | `OntologyInputUpdatePayload` |
| GET / POST | `…/ontologies/{ontology_id}/outputs` | ⇐ `OntologyOutputCreateDTO` | → `OntologyOutputResponseDTO[]` / 201 | `OntologyOutput`, `OntologyOutputPayload` |
| GET / PATCH / DELETE | `…/outputs/{output_id}` | ⇐ `OntologyOutputUpdateDTO` | → `OntologyOutputResponseDTO` / 204 | `OntologyOutputUpdatePayload` |
| GET / POST | `…/ontologies/{ontology_id}/categories` | ⇐ `CategoryCreateDTO` | → `CategoryResponseDTO[]` / 201 | `Category`, `CategoryPayload` |
| GET / PATCH / DELETE | `…/categories/{category_id}` | ⇐ `CategoryUpdateDTO` | → `CategoryResponseDTO` / 204 | `CategoryUpdatePayload` |
| GET / POST | `…/ontologies/{ontology_id}/versions` | ⇐ `OntologyVersionCreateDTO` | → `OntologyVersionResponseDTO[]` / 201 | `OntologyVersion`, `OntologyVersionCreatePayload` |
| GET / PATCH / DELETE | `…/versions/{version_id}` | ⇐ `OntologyVersionUpdateDTO` | → `OntologyVersionResponseDTO` / 204 | `OntologyVersion` |
| PUT | `…/versions/{version_id}/composition` | ⇐ `OntologyCompositionUpdateDTO` | → 200 `OntologyVersionResponseDTO` | `OntologyCompositionPayload` |
| POST | `…/versions/{version_id}/validate` | — | → 200 `OntologyValidationResponseDTO` | `ValidationResult` |
| POST | `…/versions/{version_id}/publish` | — | → 200 `OntologyVersionResponseDTO` | `OntologyVersion` |
| GET | `…/versions/{version_id}/schema` | — | → 200 `OntologyVersionSchemaResponseDTO` **(inputs/outputs newly typed)** | `ExportedOntologySchema` |

`…` = `/projects/{project_id}/ontologies/{ontology_id}`.

## Dataset — `features/dataset`

| Method | Path | Request | Response | FE type |
|---|---|---|---|---|
| POST / GET | `/projects/{project_id}/datasets` | ⇐ `DatasetCreateDTO` | → 201 `DatasetResponseDTO` / 200 `DatasetResponseDTO[]` | `Dataset`, `DatasetCreatePayload` |
| GET / PATCH | `/datasets/{dataset_id}` | ⇐ `DatasetUpdateDTO` | → 200 `DatasetResponseDTO` | `DatasetUpdatePayload` |
| PUT | `/datasets/{dataset_id}/archive` | — | → 200 `DatasetResponseDTO` | `Dataset` |
| POST | `/datasets/{dataset_id}/versions` | ⇐ `DatasetVersionCreateDTO` | → 201 `DatasetVersionResponseDTO` | `DatasetVersion` |
| GET | `/dataset-versions/{version_id}` | — | → 200 `DatasetVersionResponseDTO` | `DatasetVersion` |
| POST | `/dataset-versions/{version_id}/inherit` | ⇐ `InheritDatasetVersionRequestDTO` | → 200 `InheritDatasetVersionResponseDTO` | `InheritDatasetVersionResponse` |
| GET | `/dataset-versions/{version_id}/assets` | query `limit, offset` | → 200 `AssetResponseDTO[]` | `Asset[]` |
| POST | `/dataset-versions/{version_id}/assets` | ⇐ multipart `files` | → 201 `BatchUploadResultDTO` | `BatchUploadResult` |
| GET | `/dataset-versions/{version_id}/assets/cursor` | query `limit, cursor` | → 200 `CursorPageAssetResponseDTO` | `CursorPageAssetResponse` |
| POST | `/dataset-versions/{version_id}/prepare-upload` | ⇐ `PrepareUploadRequestDTO` | → 200 `PrepareUploadResponseDTO` | `PrepareUploadPayload`, `PrepareUploadResponse` |
| POST | `/dataset-versions/{version_id}/finalize-import` | ⇐ `FinalizeAssetImportRequestDTO` | → 201 `FinalizeAssetImportResponseDTO` | `FinalizeAssetImportPayload`, `…Response` |
| DELETE | `/dataset-versions/{version_id}/assets/{asset_id}` | — | → 204 | — |
| PUT | `/dataset-versions/{version_id}/publish` | — | → 200 `DatasetVersionResponseDTO` | `DatasetVersion` |
| GET | `/assets/{asset_id}` | — | → 200 `AssetResponseDTO` | `Asset` |
| GET | `/assets/{asset_id}/download` | — | → 200 `AssetDownloadUrlResponseDTO` | `AssetDownloadUrlResponse` |
| PUT | `/assets/{asset_id}/retire` | — | → 200 `AssetResponseDTO` | — (not called by FE) |

## Annotation — `features/annotation`

| Method | Path | Request | Response | FE type |
|---|---|---|---|---|
| GET | `/assets/{asset_id}/annotations` | — | → 200 `AnnotationResponseDTO[]` | `Annotation[]` |
| POST | `/assets/{asset_id}/open-in-label-studio` | ⇐ `OpenInLabelStudioRequestDTO` | → 200 `OpenInLabelStudioResponseDTO` | `OpenInLabelStudioRequest/Response` |
| POST | `/annotations/batch-status` | ⇐ `BatchAssetStatusRequestDTO` | → 200 `BatchAssetStatusResponseDTO` | `BatchAssetStatusResponse` |
| POST | `/annotations` | ⇐ `AnnotationCreateDTO` | → 201 `AnnotationResponseDTO` | `CreateAnnotationRequest`, `Annotation` |
| GET | `/annotations/{annotation_id}` | — | → 200 `AnnotationResponseDTO` | `Annotation` |
| GET | `/annotations/{annotation_id}/revisions` | — | → 200 `AnnotationRevisionResponseDTO[]` | `AnnotationRevision[]` |
| POST | `/annotations/{annotation_id}/revisions` | ⇐ `RevisionCreateDTO` | → 201 `AnnotationRevisionResponseDTO` | `CreateRevisionRequest` |
| GET | `/annotation-revisions/{revision_id}` | — | → 200 `AnnotationRevisionResponseDTO` | `AnnotationRevision` |
| POST | `/annotations/sync` | ⇐ Label Studio webhook payload | → 200 `AnnotationRevisionResponseDTO \| null` | — (server-to-server) |

## Workflow — `features/workflow`

| Method | Path | Request | Response | FE type |
|---|---|---|---|---|
| POST | `/workflows` | ⇐ `CreateWorkflowDefinitionRequest` | → 201 `WorkflowDefinitionResponse` | `CreateWorkflowDefinitionRequest`, `WorkflowDefinition` |
| GET | `/workflows/{workflow_id}` | — | → 200 `WorkflowDefinitionResponse` | `WorkflowDefinition` |
| GET | `/projects/{project_id}/workflow` | — | → 200 `WorkflowDefinitionResponse` | `WorkflowDefinition` |
| POST | `/work-items/batches` | ⇐ `CreateBatchWorkItemsRequest` | → 201 `WorkItemResponse[]` | `CreateBatchWorkItemsRequest`, `WorkItem[]` |
| POST | `/work-items/bulk-assign` | ⇐ `BulkAssignRequest` | → 200 `AssignmentResponse[]` | `BulkAssignRequest`, `Assignment[]` |
| POST | `/work-items/{work_item_id}/transition` | ⇐ `TransitionWorkItemRequest` | → 200 `WorkItemResponse` | `TransitionWorkItemRequest` |
| GET | `/work-items` | query `project_id, workflow_id, status, assignee_id, limit, offset` | → 200 `WorkItemResponse[]` | `WorkItemListQuery` (`ApiQueryOf`), `WorkItem[]` |
| GET | `/work-items/{work_item_id}` | — | → 200 `WorkItemResponse` | `WorkItem` |
| GET | `/work-items/{work_item_id}/history` | — | → 200 `WorkflowHistoryResponse[]` | `WorkflowHistory[]` |
| POST | `/work-items/{work_item_id}/comments` | ⇐ `AddWorkItemCommentRequest` | → 201 `WorkflowHistoryResponse` | `AddWorkItemCommentRequest` |
| POST | `/work-items/{work_item_id}/asset-reviews` | ⇐ `RecordAssetReviewRequest` (`status` now a Literal) | → 200 `WorkItemResponse` | `RecordAssetReviewRequest` |

## Hand-written FE types that remain (by design)

| FE type | Why it is not generated |
|---|---|
| zod form schemas (`loginSchema`, `createProjectSchema`, `inviteMemberSchema`, ontology node/category forms) | UI validation with Vietnamese messages; their output is passed to typed API functions, so tsc checks them against the DTOs |
| `AnnotationResult` | `results` is `list[dict[str, Any]]` in the backend (validated against the Ontology Version), this is the editor's view of one result |
| `AssetMetadata` | `metadata` is `dict[str, Any]`; known importer keys only |
| `AssetReviewItem` | one entry of the free-form `WorkItem.metadata.asset_reviews` |
| `SchemaField`, `UserQueryParams` | FE-only UI state / function arguments |
