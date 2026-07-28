# Phase 0 — Foundation & Infrastructure

> **Thời gian**: 4 tuần · **Team**: 5 devs  
> **Mục tiêu**: Dựng nền tảng kỹ thuật, dev environment, shared kernel và quy chuẩn kiến trúc để các phase sau có thể bắt đầu phát triển tính năng ngay.

---

## Tech Stack

| Thành phần | Công nghệ |
|------------|-----------|
| Backend | Python 3.12+ / FastAPI |
| Database | PostgreSQL 16 |
| ORM / Migration | Async SQLAlchemy 2.0 + Alembic |
| Dependency Injection | **Dishka** |
| Object Storage | MinIO (S3-compatible) |
| Cache / Message Broker | Redis |
| Task Queue | Celery (Redis backend) |
| Auth | External Auth Server (cookie-based & Bearer JWT, `access_token` + `refresh_token`) |
| Formatting / Linting | **Ruff** |
| Type Checking | **Mypy** |
| Frontend | Next.js 15 (App Router) |
| Container | Docker Compose |
| API Style | REST (OpenAPI 3.1) |

---

## Cấu trúc uv Workspace & Architecture Standards

### 1. Python Monorepo (`uv Workspace`)

Toàn bộ backend và các thư viện dùng chung được quản lý qua **`uv workspace`** dưới thư mục `packages/` và `backend/`:

```text
.
├── pyproject.toml                 ← Root uv Workspace configuration
├── uv.lock                        ← Unified lockfile toàn hệ thống
├── Makefile                       ← Lệnh dev: make dev-api, make ruff, make check, make test, make migrate
│
├── packages/                      ← Workspace Packages (Libraries dùng chung)
│   ├── domain/                    ← Package: `domain` (Pure Domain Entities, Interfaces, Value Objects, Domain Exceptions)
│   │   ├── pyproject.toml
│   │   └── domain/
│   │       ├── entities/          ← Domain Entities (ProjectEntity, ProjectMemberEntity, ...)
│   │       ├── interfaces/        ← Domain Interfaces (IStorageProvider, IProjectRepository, BaseRepository)
│   │       ├── exceptions.py      ← AppException hierarchy (NotFoundException, UnauthorizedException, ...)
│   │       ├── value_objects/     ← Pagination, EventBus
│   │       └── __init__.py        ← Management of sub-module exports (__all__)
│   │
│   ├── database/                  ← Package: `database` (SQLAlchemy ORM Models & Alembic)
│   │   ├── pyproject.toml
│   │   ├── alembic.ini
│   │   ├── alembic/               ← DB Migrations (alembic/versions/)
│   │   └── database/
│   │       ├── base.py            # Declarative Base (BaseModel với id ULID, created_at, updated_at)
│   │       ├── session.py         # Async DB Session Engine & Factory
│   │       └── models/            # SQLAlchemy ORM Models (ProjectModel có method .to_entity() & .from_entity())
│   │
│   ├── infrastructure/            ← Package: `infrastructure` (Adapters cho các dịch vụ ngoài)
│   │   ├── pyproject.toml
│   │   └── infrastructure/
│   │       └── storage/           # MinIOStorageAdapter triển khai IStorageProvider
│   │
│   └── shared/                    ← Package: `shared` (Utilities & External Auth Client)
│       ├── pyproject.toml
│       └── shared/
│           ├── utils/             # id_generator.py (ULID Generator)
│           └── auth/              # Auth Client & Auth Dependency/Middleware
│
├── backend/                       ← Application Service (FastAPI App - uv workspace member)
│   ├── pyproject.toml             ← Depends on `domain`, `database`, `infrastructure`, `shared`
│   └── app/
│       ├── main.py                ← FastAPI entrypoint, router includes & middleware
│       ├── config.py              ← Pydantic BaseSettings
│       ├── common/                ← Global Setup, Exception Handlers & DI Containers
│       │   ├── exceptions.py      # setup_exception_handlers(app) loguru & global exceptions
│       │   ├── setup.py           # setup_di(app) khởi tạo Dishka container
│       │   ├── database.py        # DatabaseProvider for Dishka
│       │   ├── clients.py         # StorageClientProvider for Dishka
│       │   ├── deps.py            # get_current_user, CurrentUser, AdminUser
│       │   ├── security.py        # hash_password, verify_password
│       │   └── jwt.py             # create_access_token, decode_access_token
│       │
│       └── <feature>/             ← Feature Vertical Slice (vd: project/, dataset/, ontology/)
│           ├── application/
│           │   ├── dtos/          # Pydantic v2 DTOs (ProjectCreateDTO, ProjectResponseDTO, ...)
│           │   └── use_cases/     # Strictly 1 Use Case / 1 File (create_project.py, get_project.py, ...)
│           ├── infrastructure/
│           │   ├── repository.py  # Repository triển khai IProjectRepository (chỉ nhận/trả về Entities)
│           │   └── di.py          # Feature Dishka Provider (ProjectProvider)
│           └── presentation/
│               └── router.py      # FastAPI Router với @inject & FromDishka[UseCase]
│
├── web/                           ← Next.js 15 Frontend App
└── docker-compose.yml
```

---

## Các Quy Chuẩn Kiến Trúc Bắt Buộc (Architecture Guidelines)

### 1. Độc Lập Giữa Layer & ORM Models vs Entities
- **ORM Models (`packages/database/database/models/`)**: Phải chứa 2 phương thức chuyển đổi:
  - `to_entity(self) -> DomainEntity`: Chuyển ORM Model thành Pure Domain Entity.
  - `@classmethod from_entity(cls, entity: DomainEntity) -> Self`: Khởi tạo ORM Model từ Domain Entity.
- **Repositories (`app/<feature>/infrastructure/repository.py`)**: Chỉ nhận tham số là **Domain Entities** và trả về **Domain Entities**. Thực hiện chuyển đổi ORM Model <-> Entity thông qua `.to_entity()` và `.from_entity()`.
- **Use Cases (`app/<feature>/application/use_cases/`)**: Chỉ làm việc với **Domain Entities** và **DTOs**. Nghiêm cấm trực tiếp sử dụng SQLAlchemy ORM Models trong Use Cases.
- **Quy tắc 1 File 1 Use Case**: Mỗi Use Case phải nằm trong 1 file riêng lẻ duy nhất (ví dụ: `create_project.py`, `get_project.py`, `list_user_projects.py`).

### 2. Dependency Injection VớI Dishka
- Mỗi feature module định nghĩa Dishka `Provider` tại `app/<feature>/infrastructure/di.py` (ví dụ `ProjectProvider`).
- Gom tất cả Feature Providers và Infrastructure Providers vào Dishka Container chính tại `app/common/setup.py` (`setup_di(app)`).
- Sử dụng `@inject` và `FromDishka[UseCase]` tại FastAPI presentation routers.

### 3. Quy Tắc Export Của Parent Package (`__init__.py`)
- Package cha gần nhất chịu trách nhiệm re-export các module con của nó và khai báo danh sách `__all__`.

---

## Công việc cần làm trong Phase 0

### 1. Khởi tạo uv Workspace & Environment
- Root `pyproject.toml` định nghĩa workspace members (`packages/*`, `backend`).
- Đặt cấu hình `ruff` (formatting/linting) và `mypy` (type checking) tại root `pyproject.toml`.
- Tạo lệnh Makefile: `make dev-api`, `make dev-web`, `make ruff`, `make check`, `make test`, `make migrate`, `make create-migration`.

### 2. Docker Compose Dev Environment
- PostgreSQL 16, MinIO, Redis, Backend (uvicorn hot-reload), Frontend (next dev), Celery worker.
- Health check cho tất cả các dịch vụ.

### 3. FastAPI App Core & Global Utilities
- Entry point `main.py`: CORS, Router registration, Dishka DI setup (`setup_di`), Exception handling (`setup_exception_handlers`).
- Cấu hình `app/config.py` đọc từ file `.env` bằng `pydantic-settings`.
- API versioning: `/api/v1/`.
- `app/common/`: Tích hợp `loguru` logger, `jwt.py`, `security.py`, `datetime_utils.py`, `deps.py`.

### 4. Database Setup
- SQLAlchemy 2.0 async engine + session factory
- Alembic config cho migration
- Initial empty migration

### 5. Shared Kernel
- **BaseEntity**: id (ULID), created_at, updated_at
- **BaseRepository**: generic CRUD interface (get, list, create, update, delete)
- **Pagination**: PaginationParams, PaginatedResponse
- **Error handling**: custom exception classes (NotFound, Conflict, Forbidden, ValidationError)
- **Domain Event Bus**: in-process publish/subscribe cho domain events
- **ID Generator**: ULID

### 6. Storage Provider
- Domain Interface: `IStorageProvider` tại `packages/domain/domain/interfaces/storage.py` (`upload`, `download`, `delete`, `get_presigned_url`, `get_presigned_upload_url`).
- Implementation Adapter: `MinIOStorageAdapter` tại `packages/infrastructure/infrastructure/storage/minio_adapter.py`.
- Tự động kiểm tra/tạo bucket trên MinIO khi ứng dụng khởi động.

### 7. Auth Integration
- Client giao tiếp Auth Server (`shared/auth/client.py`).
- Auth dependency & middleware (`shared/auth/middleware.py`): Đọc `access_token` từ Cookie hoặc Bearer Header → Xác thực và trả về `CurrentUser`.

### 8. Observability & Health Probes
- Endpoints probe: `GET /health`, `GET /ready` (kiểm tra trạng thái DB + MinIO + Redis).
- Loguru structured log format.

### 9. Testing Infrastructure
- `pytest` + `pytest-asyncio` setup trong `tests/`.
- Chạy toàn bộ test suite qua `make test` (hoặc `uv run pytest tests/`).

### 10. Frontend Scaffold
- Next.js 15 app (App Router) với Tailwind CSS / UI Library.
- Auth flow client: Login page → Cookie session → `useAuth` hook.
- Layout shell: Sidebar, Navbar, Loading states, Error boundary.

---

## Phân công (4 tuần × 5 devs)

| Tuần | Dev 1 | Dev 2 | Dev 3 | Dev 4 | Dev 5 |
|------|-------|-------|-------|-------|-------|
| **1** | Repo setup, linting, CI | Docker Compose, Makefile | FastAPI core, config, logging | SQLAlchemy + Alembic setup | Next.js scaffold, layout |
| **2** | BaseEntity, BaseRepo, ID gen | StorageProvider + MinIO adapter | Pagination, Error handling | Event Bus | Auth client + middleware |
| **3** | Auth middleware hoàn chỉnh | Test infrastructure | CI pipeline hoàn chỉnh | OpenTelemetry + health checks | Frontend auth flow + API client |
| **4** | Integration tests (MinIO, DB) | Integration tests (Auth) | API docs customization | Docker optimization | Frontend layout shell |

---

## Acceptance Criteria

- [ ] `docker compose up` khởi chạy thành công toàn bộ stack (PostgreSQL, MinIO, Redis, Backend, Frontend).
- [ ] `GET /health` và `GET /ready` trả về `200 OK`.
- [ ] Lệnh `make migrate` và `make create-migration DESC="..."` hoạt động bình thường bên trong `packages/database`.
- [ ] Lệnh `make ruff` format & lint sạch toàn bộ dự án.
- [ ] Lệnh `make check` thực hiện type check (mypy) không còn bất kỳ lỗi nào.
- [ ] Lệnh `make test` thực thi thành công toàn bộ test suite.
- [ ] MinIO Storage upload/download/presigned URL hoạt động qua `IStorageProvider` & `MinIOStorageAdapter`.
- [ ] DTOs, Use Cases (1 Use Case / 1 File), Repositories hoạt động 100% với **Domain Entities**.
- [ ] Dishka DI container tự động inject dependencies vào routers.
- [ ] Auth flow thành công: Cookie / Bearer Header → `get_current_user` → Trả về `CurrentUser`.
- [ ] Frontend Login → Dashboard hiển thị thông tin User đăng nhập.
