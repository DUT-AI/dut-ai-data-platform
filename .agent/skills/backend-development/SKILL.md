---
name: backend-development
description: Backend guidelines for Clean Architecture and Domain-Driven Design (DDD) using Python, FastAPI, Dishka, SQLAlchemy (asyncpg), and Alembic.
---

# Backend Clean Architecture & DDD Guidelines

This project enforces **Clean Architecture** and **Domain-Driven Design (DDD)** principles to separate core business rules from external technologies (frameworks, databases, web clients).

---

## 🏗️ Clean Architecture Directory Layout

All backend code lives in the `app/` directory and is structured as follows:

```text
app/
├── core/               # Shared cross-cutting concerns (JWT, timezone, cryptography)
├── domain/             # Core Enterprise Business Rules (Pure Python)
│   ├── entities/       # Domain Models / Rich Entities (No database or framework imports)
│   ├── interfaces/     # Repository and Client interface protocols (Abstract Interfaces)
│   └── exceptions/     # Domain-specific validation and conflict exceptions
├── application/        # Application Business Rules (Use Cases, Orchestration)
│   ├── dtos/           # Input validation (Request) and Output serialization (Response) Pydantic schemas
│   └── use_cases/      # Use case execution blocks. Injects Domain Interfaces via constructors.
├── infrastructure/     # External Frameworks & Persistences (Infrastructure details)
│   ├── persistence/    # SQLAlchemy models, Declarative Base, and Database Session setup
│   ├── repositories/   # Persistence implementations executing queries on DB
│   ├── clients/        # External services integration (e.g. S3Client using boto3)
│   └── di/             # Dependency Injection setup and providers using Dishka
└── presentation/       # Driving Adapters (Delivery mechanisms)
    └── api/            # FastAPI configuration, Routers, Dependencies, and Exceptions handler
```

---

## 🛡️ Architecture Layer Rules

### 1. Domain Layer (`app/domain`)
- **Strict Rule:** Must be written in pure Python. **No imports** from FastAPI, Pydantic, SQLAlchemy, or third-party database drivers.
- **Entities (`entities/`)**: Model real-world objects using standard Python classes or `@dataclass`. Must hold domain validations.
- **Interfaces (`interfaces/`)**: Define repository interfaces using `typing.Protocol` (abstract types) to abstract database access:
  ```python
  from typing import Protocol, Optional
  from app.domain.entities.user import UserEntity


  class IUserRepository(Protocol):
      async def get_by_email(self, email: str) -> Optional[UserEntity]: ...
      async def add(self, user: UserEntity) -> UserEntity: ...
  ```

### 2. Application Layer (`app/application`)
- **Use Cases (`use_cases/`)**: Implement single transactions. They receive inputs (DTOs), load entities from repositories, orchestrate domain actions, persist results, and return outputs.
- **Dependency Inversion:** Use Cases must receive interfaces (e.g., `IUserRepository`), not concrete implementations, via their constructor:
  ```python
  class RegisterUseCase:
      def __init__(self, user_repo: IUserRepository) -> None:
          self._user_repo = user_repo
  ```

### 3. Infrastructure Layer (`app/infrastructure`)
- **SQLAlchemy Models (`persistence/models/`)**: Define database schemas. Keep these distinct from Domain Entities. Do not leak database columns or relationships into the Domain layer.
- **Repositories (`repositories/`)**: Implement repository interfaces. Responsible for query execution and converting SQLAlchemy models to/from Domain Entities:
  ```python
  class UserRepository(IUserRepository):
      def __init__(self, session: AsyncSession) -> None:
          self._session = session
  ```
- **Clients (`clients/`)**: Implement communication with external APIs (S3, Payment Gateways, Email services).

### 4. Presentation Layer (`app/presentation`)
- **FastAPI Routers (`api/routers/`)**: Validate request bodies, call the appropriate application Use Case, and serialize output DTOs.
- **Inject Use Cases via Dishka:** Never construct Use Cases directly in the router or use standard FastAPI dependencies. Inject them via Dishka:
  ```python
  from dishka.integrations.fastapi import FromDishka
  from app.application.use_cases.auth.login import LoginUseCase


  @router.post("/login")
  async def login(payload: UserLoginInput, use_case: FromDishka[LoginUseCase]):
      return await use_case.execute(payload)
  ```

---

## 🧪 Dependency Injection (Dishka)

Always register and resolve objects using **Dishka**.

### Scopes Definition:
- **`Scope.APP`**: Application-level singletons (e.g. `AsyncEngine`, `IS3Client` instances).
- **`Scope.REQUEST`**: Re-created per HTTP request (e.g. `AsyncSession`, concrete repository `UserRepository`, and Use Cases).

---

## 💾 Persistency & Transactions

1. **SQLAlchemy Async:** Always use `asyncpg` and asynchronous drivers (`postgresql+asyncpg://`).
2. **Transaction boundary:** Session commits must happen in the Use Case or middleware level. Use Cases should execute inside a database transaction session.

---

## 🚦 Testing Protocol

1. **SQLite In-Memory:** Use SQLite in-memory databases with `aiosqlite` for fast, isolated tests.
2. **Mocking Clients:** Mock S3 clients or other network-dependent services to prevent test environment leakage.
