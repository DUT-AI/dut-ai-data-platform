---
trigger: always_on
---

# DUT AI Data Platform - Project Rules

Tài liệu này định nghĩa các quy tắc chuẩn về phát triển, đặt tên biến, kiến trúc mã nguồn và quy trình làm việc với AI Agent cho dự án.

## 1. Nguyên Tắc Chung (General Principles)
*   **Giới Hạn Phạm Vi Sửa Đổi (Strict Scope Focus):** Chỉ chỉnh sửa những file và đoạn code liên quan trực tiếp đến nhiệm vụ (task/ticket) đang được giao. Tuyệt đối không tự ý "động chạm", thay đổi hay refactor các phần code không liên quan để tránh gây ra lỗi lan truyền (side-effects) và xung đột mã nguồn (merge conflicts).
*   **Không Hard Code (No Hard-coding):** Tuyệt đối không nhúng trực tiếp các giá trị cố định (chuỗi, số, API keys) vào logic code. Đưa các chuỗi cấu hình hoặc hằng số cố định vào biến cấu hình (`.env`, `core/config/`) hoặc hằng số `UPPER_SNAKE_CASE` để tránh Magic Numbers / Magic Strings[cite: 2].
*   **Không Thay Đổi Kiến Trúc Code:** Giữ nguyên và tuân thủ các pattern kiến trúc, cấu trúc thư mục, và mô hình mà dự án đang sử dụng.
*   **Đảm Bảo Tính Bảo Mật:** Không commit thông tin nhạy cảm, luôn validate dữ liệu đầu vào và phân quyền chặt chẽ các API.
*   **Rõ Nghĩa & Tự Giải Thích (Self-descriptive):** Đặt tên thể hiện đúng bản chất và mục đích[cite: 2]. Tránh viết tắt tối nghĩa (dùng `user_id` thay vì `uid`, `response` thay vì `res_tmp`)[cite: 2].
*   **Nhất Quán Theo Nền Tảng:** Backend Python dùng `snake_case`[cite: 2]. Frontend TypeScript dùng `camelCase`[cite: 2].

## 2. Backend (Python / FastAPI / Clean Architecture & DDD)
Tuân thủ chuẩn **PEP 8** kết hợp với các nguyên tắc **Clean Architecture** và **Domain-Driven Design (DDD)**[cite: 2].

### 2.1. Quy Tắc Đặt Tên (Naming Conventions)
*   **Biến thông thường & Tham số:** Sử dụng `snake_case` (rõ nghĩa, danh từ hoặc cụm danh từ), ví dụ: `user_id`, `access_token`, `auth_client`, `timeout`[cite: 2].
*   **Biến Boolean (Đúng / Sai):** Sử dụng `snake_case` với tiền tố `is_`, `has_`, `can_`, `should_`, ví dụ: `is_active`, `is_success`, `has_permission`, `is_secure`[cite: 2].
*   **Thuộc tính Private / Protected trong Class:** Sử dụng `_snake_case` (Bắt đầu bằng dấu gạch dưới `_`), ví dụ: `self._user_repo`, `self._session`, `self._build_url`[cite: 2].
*   **Hằng số & Biến môi trường:** Sử dụng `UPPER_SNAKE_CASE` (Chữ in hoa toàn bộ), ví dụ: `JWT_SECRET_KEY`, `AUTH_SERVER_URL`, `POSTGRES_DB`[cite: 2].
*   **Class (Entity / UseCase / Service / Model):** Sử dụng `PascalCase` mang hậu tố đại diện đúng tầng DDD, ví dụ: `AuthUser`, `LoginUseCase`, `AuthClient`, `IdentityProvider`[cite: 2].
*   **DTO (Data Transfer Object):** Sử dụng `PascalCase` với hậu tố `DTO` (hoặc `Input`/`Output`), ví dụ: `LoginRequestDTO`, `LoginResponseDTO`, `UserCreateDTO`[cite: 2].
*   **Interface / Protocol (Domain Layer):** Sử dụng `PascalCase` bắt đầu bằng chữ `I`, ví dụ: `IUserRepository`, `IDatasetRepository`, `IAuthClient`[cite: 2].
*   **Tên file & module Python:** Sử dụng `snake_case.py` (Ngắn gọn, đại diện cho chức năng/entity), ví dụ: `auth_client.py`, `get_users.py`, `entities.py`[cite: 2].

### 2.2. Quy Tắc Kiến Trúc Backend (DDD Layer Rules)
*   **Domain Layer (`modules/*/domain/`):** Viết bằng Pure Python, **tuyệt đối không** import FastAPI, SQLAlchemy, HTTP clients hay framework-specific libraries[cite: 2]. Định nghĩa `entities.py` (Domain Entities) và `interfaces/` (sử dụng `typing.Protocol`)[cite: 2].
*   **Application Layer (`modules/*/use_cases/`, `modules/*/dtos/`):** Chứa logic ứng dụng (`UseCases`)[cite: 2]. Nhận DTOs, tương tác với Domain Interfaces và trả về kết quả[cite: 2]. Phụ thuộc vào interface (`IUserRepository`), không phụ thuộc trực tiếp vào database repository concrete[cite: 2].
*   **Infrastructure Layer (`modules/*/infrastructure/`, `core/`):** Triển khai Database Models (SQLAlchemy Declarative), Repositories cụ thể, Third-party Clients (MinIO S3, Auth Server API)[cite: 2].
*   **Presentation Layer (`apps/api/routers/`):** Router chỉ nhận request, validate qua Pydantic DTO, gọi UseCase thông qua **Dishka** Dependency Injection và trả response[cite: 2].

## 3. Frontend (TypeScript / Next.js / React)
Tuân thủ chuẩn **TypeScript Best Practices** và **React Community Conventions**[cite: 2].

### 3.1. Quy Tắc Đặt Tên (Naming Conventions)
*   **Biến, Object Properties & Functions:** Sử dụng `camelCase` (Động từ cho hàm hoặc danh từ cho biến), ví dụ: `userName`, `accessToken`, `fetchUserData`, `userData`[cite: 2].
*   **Biến Boolean:** Sử dụng `camelCase` với tiền tố `is`, `has`, `should`, `can`, ví dụ: `isLoading`, `isAuthenticated`, `hasError`, `canEdit`[cite: 2].
*   **Event Handlers:** Sử dụng `camelCase` với tiền tố `handle` (hàm xử lý) hoặc `on` (props), ví dụ: `handleSubmit`, `handleClick`, `onSuccess`, `onSelect`[cite: 2].
*   **Custom Hooks:** Sử dụng `camelCase` bắt đầu bằng tiền tố `use`, ví dụ: `useAuth`, `useLogin`, `useProjects`, `useDebounce`[cite: 2].
*   **React Components & Contexts:** Sử dụng `PascalCase` (Danh từ đại diện UI), ví dụ: `LoginForm`, `AuthContext`, `ProtectedRoute`, `UserTable`[cite: 2].
*   **Type, Interface, Enum:** Sử dụng `PascalCase` (Danh từ đơn hoặc cụm từ), ví dụ: `User`, `AuthResponse`, `LoginCredentials`, `ProjectRole`[cite: 2].
*   **Hằng số toàn cục:** Sử dụng `UPPER_SNAKE_CASE` (Chữ in hoa toàn bộ), ví dụ: `NEXT_PUBLIC_API_BASE_URL`, `DEFAULT_PAGE_SIZE`[cite: 2].
*   **Tên file & thư mục (Web):** Sử dụng `kebab-case.ts(x)` (Chữ thường nối gạch ngang), ví dụ: `login-form.tsx`, `auth-service.ts`, `use-auth.ts`[cite: 2].

### 3.2. Quy Tắc Cấu Trúc Thư Mục Frontend
*   **`web/src/features/{feature-name}/`**: Tổ chức theo tính năng[cite: 2].
    *   Bao gồm: `components/` cho UI components riêng của tính năng đó (`kebab-case.tsx`), `hooks/` cho custom hooks riêng (`use-{feature}.ts`), `services/` hoặc `api/` cho API call functions (`{feature}-service.ts`), `types/` cho khai báo Type/Interface (`{feature}-types.ts` hoặc `index.ts`)[cite: 2].
*   **`web/src/components/`**: Các UI component dùng chung toàn ứng dụng (Buttons, Modals, Loaders,...)[cite: 2].
*   **`web/src/contexts/`**: React Context quản lý global state (Auth, Theme,...)[cite: 2].
*   **`web/src/app/`**: Next.js App Router (sử dụng Route Groups như `(protected)`, folders dạng `kebab-case`)[cite: 2].

## 4. Mandatory Agent & Skill Protocol
Before frontend, UI, styling, design, browser debugging, testing, or fix work:
1. Classify the task domain.
2. Select the relevant agent from `.agent/agents`.
3. Read that agent file and inspect its `skills:` frontmatter.
4. Read only the relevant `.agent/skills/<skill>/SKILL.md` files.
5. Follow referenced files only when the selected `SKILL.md` requires extra detail.
6. Do not load every skill at once.
7. Briefly state which agent and skill were selected before implementation.

### 4.1. Agent Routing
| Task | Agent |
| --- | --- |
| Frontend implementation, React, Next.js, components | `.agent/agents/frontend-specialist.md` |
| Backend implementation, Python, FastAPI, DDD | `.agent/agents/backend-specialist.md` |
| UI/UX design, visual direction, design systems | `.agent/agents/ui-ux-designer.md` |
| Bugs, browser issues, hydration, broken UI behavior | `.agent/agents/debugger.md` |
| Validation, tests, final checks, UI regression checks | `.agent/agents/test-engineer.md` |

### 4.2. Operating Rules & Workflows
*   Prefer the selected skill over generic model defaults.
*   Keep context focused: one primary skill first, then add supporting skills only if the task crosses domains.
*   Antigravity-style workflows live in `.agent/workflows`.
*   Available Workflows:
    *   `/ui-ux-pro-max`: design, build, review, or improve frontend UI.
    *   `/debug`: investigate and fix frontend defects.
    *   `/test`: validate frontend changes.
    *   `/preview`: start or inspect a frontend preview.