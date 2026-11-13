# Architectural Research & Decisions: Remediation of Code Smells & Clean Architecture Flaws

## Research Topics & Decisions

### 1. Pure Domain Exceptions & Protocol Agnosticism (Issue 2.1)

- **Problem**: `DomainException` in `core/exceptions/base.py` contained `status_code: int = 400`, and `DatasetVersionPolicy` in `modules/dataset/domain/policies.py` raised HTTP-specific `BadRequestException`. This violated domain purity, forcing non-HTTP callers (e.g. AMQP workers, CLI, gRPC) to deal with HTTP response codes.
- **Decision**:
  - Strip `status_code` entirely from `DomainException(message: str, details: dict[str, Any] | None = None)`.
  - Establish semantic domain exceptions inheriting from `DomainException`:
    - `EntityNotFoundError` (replaces `NotFoundException`)
    - `InvariantViolationError` (replaces input/entity validation failures)
    - `BusinessRuleViolationError` (replaces policy/lifecycle rule check failures)
    - `ConflictError` (replaces `ConflictException`)
    - `UnauthorizedError` (replaces `UnauthorizedException`)
    - `ForbiddenError` (replaces `ForbiddenException`)
  - Retain backwards-compatible aliases for legacy imports during transition (`NotFoundException = EntityNotFoundError`, etc.).
  - Centralize HTTP status code mapping in `core/exceptions/handlers.py`:
    ```python
    EXCEPTION_HTTP_STATUS_MAP: dict[type[DomainException], int] = {
        EntityNotFoundError: 404,
        ConflictError: 409,
        UnauthorizedError: 401,
        ForbiddenError: 403,
        InvariantViolationError: 400,
        BusinessRuleViolationError: 400,
    }
    ```
- **Rationale**: Clean Architecture strictly isolates the Domain layer from delivery/presentation mechanisms. HTTP status codes belong exclusively to presentation adapters (`apps/api`).

---

### 2. User Identifier Type Consistency (`user_id: int`) & Dataclass Formatting (Issue 2.2)

- **Problem**: 
  - In `modules/project/domain/entities.py`, `def __post_init__(self)` was placed between dataclass field declarations (`user_id: int` followed by method, followed by `role: str`), violating PEP 8 and Python dataclass syntax conventions.
  - In `modules/project/models/project.py` and `modules/annotation/models/annotation.py`, mappers used defensive ternary `created_by=int(self.created_by) if str(self.created_by).isdigit() else self.created_by`.
  - In `apps/api/routers/annotation.py`, an unauthenticated or system call defaulted to `"system"`, corrupting `created_by: int` with a string value.
- **Decision**:
  - Reorganize all `@dataclass` definitions: declare all fields contiguously at the top; place `__post_init__` at the bottom after all fields.
  - Introduce `SYSTEM_USER_ID: int = 0` in `core/constants.py` as the canonical sentinel ID for system actors, background tasks, and unauthenticated seed scripts.
  - Replace `getattr(..., "id", "system")` with `getattr(..., "id", SYSTEM_USER_ID)`.
  - Standardize mapper casting: `created_by = int(self.created_by) if str(self.created_by).isdigit() else SYSTEM_USER_ID`.
- **Rationale**: Eliminates runtime type divergence (`int` vs `str`) and ensures static type checkers (`mypy`) validate cleanly.

---

### 3. Safe Seeder Transaction Boundaries & Exception Propagation (Issue 2.3)

- **Problem**: In `modules/ontology/services/seeder.py`, lines 193-196 caught `Exception`, called `self.session.rollback()`, and logged a warning. This rolled back the shared `AsyncSession` owned by `CreateOntologyUseCase`, wiping out the newly created ontology and version while still returning HTTP `201 Created` with a ghost ID.
- **Decision**:
  - Remove all direct calls to `self.session.rollback()` from `OntologyTemplateSeederService`.
  - Execute template seeding within a SQLAlchemy Savepoint (`async with self.session.begin_nested():`).
  - If seeding fails:
    - The nested transaction rolls back cleanly without corrupting or aborting the parent transaction.
    - If template seeding is considered a critical requirement for project creation, raise a typed `OntologySeedingError(DomainException)` so that the outer use case fails fast and returns an appropriate error to the client instead of a deceptive 201 Created.
- **Rationale**: Preserves the Single Responsibility Principle: application services should not unilaterally abort request-scoped session transactions.

---

### 4. HTTP Connection Pooling via Dishka DI (`Scope.APP`) (Issue 2.4)

- **Problem**: `AuthClient` and `ManageClient` instantiated a new `httpx.AsyncClient(timeout=self.timeout)` inside each method call (`get_me`, `login`, `list_users`). This caused repeated TCP+TLS handshakes, 20-60ms extra latency per call, and risk of socket port exhaustion under load.
- **Decision**:
  - Register a long-lived `httpx.AsyncClient` in Dishka DI with `Scope.APP`:
    ```python
    @provide(scope=Scope.APP)
    async def get_http_client(self) -> AsyncIterable[httpx.AsyncClient]:
        limits = httpx.Limits(max_keepalive_connections=20, max_connections=100)
        async with httpx.AsyncClient(limits=limits, timeout=10.0) as client:
            yield client
    ```
  - Inject this client into `AuthClient(client: httpx.AsyncClient)` and `ManageClient(client: httpx.AsyncClient)`.
  - Replace `from fastapi import HTTPException` in `AuthClient` and `ManageClient` with domain/infrastructure exceptions (`AuthenticationFailedError`, `RemoteServiceUnavailableError`).
- **Rationale**: Connection reuse dramatically improves API throughput, reduces CPU consumption, and adheres to Dependency Inversion.

---

### 5. Dead Code Elimination (Issue 2.5)

- **Problem**: `modules/ontology/use_cases/ontologies.py` retained lines 47-191 (`seed_ontology_from_template`), which was superseded by `OntologyTemplateSeederService` and is completely unreferenced.
- **Decision**:
  - Delete `seed_ontology_from_template` (144 lines) and remove unused imports (`IProjectRepository`, `IProjectCatalogRepository`, etc.).
- **Rationale**: Removes dead weight, improves code readability, and eliminates developer confusion.
