# Architectural Research & Decisions: Backend Clean Architecture & SOLID Refactoring

## Research Topics & Decisions

### 1. User Identifier Type Standardization (`user_id: int`)

- **Context**: The platform interacts with an external Manage/Auth Server. Previously, code contained defensive casting between `int` and `str` (e.g. `getattr(current_user, "user_id", None) or getattr(current_user, "id", "system")`), causing confusion between platform ULIDs and user IDs.
- **Decision**: 
  - `user_id` is **strictly typed as `int`** across all domain entities, DTOs, and repository methods.
  - User references on platform entities (`ProjectEntity.created_by: int`, `ProjectMemberEntity.user_id: int`, `AnnotationEntity.created_by: int`, `AnnotationRevisionEntity.created_by: int`, `DatasetEntity.created_by: int | None`) are typed as `int`.
  - Platform resource identifiers (`project_id`, `dataset_id`, `asset_id`, `annotation_id`, `ontology_id`) remain **ULID `str`**.
- **Rationale**: User explicitly confirmed: *"Ở phần User thì chắc chắn user_id là int rồi, ko phải str hay uuid đâu"*. Standardizing `int` reflects the external source of truth and eliminates hybrid type casting in JWT decoding and router dependencies.
- **Alternatives Considered**:
  - `str` for all IDs: Rejected because external auth database issues `int` auto-increment primary keys.
  - Wrapper Value Object `UserId`: Over-engineering for Python typing; standard `int` with type hints provides compile-time and runtime clarity.

---

### 2. Annotation Aggregate Root & Revision Sequence Invariant

- **Context**: Currently, `SqlAnnotationRepository.create_revision` performs a database query `select(AnnotationRevisionModel)` and calculates `max(revision_number) + 1`. Meanwhile, use cases hardcoded `revision_number=1` or `revision_number=0`.
- **Decision**: 
  - `AnnotationEntity` becomes a rich **Aggregate Root**.
  - Methods: `add_revision(source: str, results: list[dict], category_ids: list[str], created_by: int) -> AnnotationRevisionEntity`.
  - The aggregate maintains its collection of revisions and increments `revision_number = len(self.revisions) + 1` (or `max + 1`).
  - `SqlAnnotationRepository` only persists models and maps to/from the aggregate; it contains zero sequence calculation logic.
- **Rationale**: In Domain-Driven Design, Aggregate Roots are responsible for maintaining their own invariants. A repository is merely a collection abstraction for storage, not a business calculator.
- **Alternatives Considered**:
  - PostgreSQL trigger or auto-increment column per annotation: Database-specific coupling, difficult to unit test in memory.
  - Domain Service for revision numbers: Unnecessary indirection since the revision belongs strictly within the boundary of the `Annotation` aggregate.

---

### 3. Decoupling High-Arity Use Cases (`CreateOntologyUseCase`)

- **Context**: `CreateOntologyUseCase` injects 9 repositories in `__init__`, and `seed_ontology_from_template` takes 11 parameters, directly reading and writing across `Project`, `ProjectCatalog`, and 6 `Ontology` sub-tables.
- **Decision**: 
  - Extract the template translation and seeding orchestration into a dedicated `OntologyTemplateSeederService`.
  - Introduce an abstraction `IProjectTemplateCatalogService` to query template specifications without coupling `Ontology` to `IProjectRepository` and `IProjectCatalogRepository`.
  - Reduce `CreateOntologyUseCase` dependencies to 3:
    1. `IOntologyRepository`
    2. `IOntologyVersionRepository`
    3. `OntologyTemplateSeederService`
- **Rationale**: Complies with Single Responsibility Principle and Interface Segregation. Makes `CreateOntologyUseCase` testable with simple mocks.
- **Alternatives Considered**:
  - Fully asynchronous event-driven seeding via Outbox (`ProjectCreated` -> Worker -> Create Ontology): Excellent long-term pattern, but synchronous project creation UX currently expects the ontology to be immediately available upon project creation. The service abstraction maintains immediate consistency without tight repository coupling.

---

### 4. Resilient S3 Storage Adapter & Dependency Inversion

- **Context**: `S3PredictionStorage` instantiated `MinIOStorageAdapter` directly in `__init__`, accessed `self._adapter.client.put_object` (Law of Demeter), ran blocking synchronous I/O, and swallowed errors returning a fake S3 URI `s3://...`.
- **Decision**: 
  - Re-implement `S3PredictionStorage` to depend on abstract `IStorageProvider` (defined in `core/storage/interface.py`).
  - Use asynchronous non-blocking upload: `await self._storage_provider.upload(...)`.
  - Raise typed `StorageUploadError` upon failure; never return fallback mock URIs.
  - Register `InferenceProvider` in `apps/api/di.py` and bind it into Dishka container for both `apps/api` and `apps/ai_worker`.
- **Rationale**: Fixes silent data loss in AI inference pipelines and enforces Dependency Inversion Principle.
- **Alternatives Considered**:
  - Running boto3 in `asyncio.to_thread`: Viable workaround, but `core/storage` already provides an async `IStorageProvider`. Reusing the existing abstraction is cleaner.

---

### 5. Partitioning Large Use Case Modules (`dataset_use_cases.py`)

- **Context**: `modules/dataset/use_cases/dataset_use_cases.py` contains 660 lines and 15 distinct use cases.
- **Decision**: 
  - Split into individual files matching `modules/project/use_cases/` pattern:
    - `create_dataset.py`
    - `get_dataset_detail.py`
    - `list_project_datasets.py`
    - `update_dataset.py`
    - `delete_dataset.py`
    - `create_dataset_version.py`
    - `publish_dataset_version.py`
    - `upload_version_assets.py`
    - `finalize_asset_import.py`
    - `inherit_dataset_version.py`
    - `download_asset.py`
  - Re-export all use cases from `modules/dataset/use_cases/__init__.py` to maintain backwards compatibility with existing imports in routers and tests.
- **Rationale**: High cohesion, easy code reviews, clear git diffs, and prevents merge conflicts.
