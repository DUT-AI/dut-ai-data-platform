# Checkpoint 6 — Final Integration, E2E Verification & Final Report

## 1. Scope

Nghiệm thu toàn diện hệ thống **Authentication + Read-only User Management** trên nền tảng **DUT AI Data Platform**, bao gồm:
* Verification toàn bộ các luồng Login, Logout, CurrentUser, Last Login Persistence, Read-only User Management Backend & Frontend.
* Rà soát Hardcode, Secret Leaks, N+1 Queries, và Clean Architecture boundaries.
* Tổng hợp bộ test tự động và kết quả build tĩnh của Backend & Frontend.

---

## 2. Final Architecture

Hệ thống tuân thủ nghiêm ngặt **Vertical Slice / Clean Architecture** và **Workspace-Centric**:

```text
.env (Git-ignored)
  ↓
AppSettings (core/config/app.py)
  ↓
Dishka DI Container (modules/identity/di.py - Scope.APP & Scope.REQUEST)
  ├── AuthClient (httpx, timeout=10.0s)
  ├── ManageClient (httpx, timeout=10.0s)
  ├── SqlUserLoginRepository (PostgreSQL atomic upsert, batch select)
  ├── LoginUseCase
  ├── GetMeUseCase
  └── ListUsersUseCase
        ↓
FastAPI Presentation Layer (apps/api/routers/identity.py, apps/api/routers/users.py)
        ↓
Protected Dependency (CurrentUser via AuthClient.get_me)
        ↓
Frontend Shared Client (web/src/lib/api.ts - Axios Interceptors)
        ↓
TanStack React Query / AuthContext (web/src/features/auth, web/src/features/users)
        ↓
Next.js App Router (/login, /dashboard, /users, /projects)
```

---

## 3. Authentication Final State

* **Source of Truth**: External Auth Server (`https://manage.dutai.io.vn/api/v1/auth/me`).
* **Endpoints**:
  * `POST /api/v1/auth/login`: Xác thực credentials qua External Auth, nhận Bearer token và cập nhật `last_login_at` duy nhất tại thời điểm đăng nhập thành công.
  * `GET /api/v1/auth/me`: Trả về thông tin `current_user` qua đúng **1 remote call duy nhất** (đã loại bỏ duplicate call).
  * `POST /api/v1/auth/logout`: Endpoint tiêu hủy phiên đăng nhập client-side và trả về 200 OK chuẩn xác.
* **CurrentUser**: Dependency [apps/api/deps/auth.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/apps/api/deps/auth.py) trích xuất Bearer token và xác minh danh tính qua `AuthClient.get_me`. Không sử dụng local secret key để decode external tokens.

---

## 4. User Management Final State

* **Chế độ Read-Only**: Data Platform **không sở hữu CRUD User** và không có các thao tác tạo/sửa/xóa user.
* **OpenAPI Registered Method**: Chỉ duy nhất **`GET /api/v1/users`**. Tuyệt đối không có các route `POST`, `PUT`, `PATCH`, `DELETE` cho users.
* **Data Merge Pipeline**:
  1. Gọi `ManageClient.list_users(token, page, page_size, search)` để lấy danh sách $N$ người dùng từ Manage API.
  2. Lấy danh sách ID `[str(u.id) for u in items]` và thực thi **1 query SQL duy nhất**:
     ```sql
     SELECT user_id, last_login_at FROM user_login_metadata WHERE user_id IN (...);
     ```
  3. Ghép nối `last_login_at` in-memory ($O(1)$) và trả về `UsersListResponseDTO`.
* **Zero N+1 Query**: Đã kiểm chứng qua test `test_list_users_use_case_merge_last_login` và `test_list_users_use_case_empty_users`.

---

## 5. Last Login Final State

* **Bảng Cơ sở dữ liệu**: `user_login_metadata` (Migration `008_create_user_login_metadata` ở trạng thái `head`).
  * `user_id`: VARCHAR(255) PRIMARY KEY.
  * `last_login_at`: TIMESTAMPTZ NOT NULL.
* **Kích hoạt ghi nhận**: Chỉ ghi nhận khi `POST /auth/login` trả về token hợp lệ.
* **Không bị ảnh hưởng (Regression-free)**: Các request `GET /auth/me`, `GET /users`, hay `POST /auth/logout` tuyệt đối không kích hoạt ghi nhận hay thay đổi `last_login_at`.

---

## 6. Frontend Final State

* **Trang `/users`**:
  * Cấu trúc module: [web/src/features/users/](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/features/users/).
  * Hiển thị: Avatar/Initials + Tên, Email, Vai trò (Badges), Trạng thái, Lần đăng nhập cuối (Locale `vi-VN` hoặc nhãn "Chưa đăng nhập").
  * Tìm kiếm: Thanh search có debounce 350ms tự động reset trang 1.
  * Phân trang: Phân trang server-side (`page`, `page_size=20`).
* **Route Protection & UX**:
  * [web/src/app/(protected)/layout.tsx](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/app/%28protected%29/layout.tsx): Client-side Auth Guard kiểm tra `useAuth()`. Hiển thị spinner toàn màn hình trong khi xác thực, chống hoàn toàn hiện tượng flash unauthenticated content.
  * [web/src/lib/api.ts](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/lib/api.ts): Axios 401 response interceptor tự động xóa token và chuyển hướng về `/login` (kèm cơ chế chống loop trên trang login).
  * [web/src/components/layout/app-shell.tsx](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/components/layout/app-shell.tsx): Menu Sidebar có "Người dùng" (icon `Users`) và nút "Đăng xuất" (icon `LogOut`).

---

## 7. Environment & Config

* Biến môi trường chuẩn hóa:
  * `AUTH_SERVER_URL`: URL External Auth (`https://manage.dutai.io.vn/api/v1`).
  * `MANAGE_SERVER_URL`: URL Manage Service (`https://manage.dutai.io.vn/api/v1`).
  * `EXTERNAL_API_TIMEOUT`: `10.0` giây.
* File `.env` được **git-ignore** hoàn toàn (đã xác minh bằng `git check-ignore .env`).
* File `.env.example` chỉ chứa placeholder, không chứa credential thật.

---

## 8. Hardcode Audit

* Đã rà soát toàn diện mã nguồn:
  * Không còn URL domain `manage.dutai.site` hay `manage.dutai.io.vn` nào nằm cứng trong business logic hay client code.
  * Không còn hằng số token cũ `project_boilerplate_token` (đã chuẩn hóa thành `dut_ai_token`).
  * Không còn manual string splitting `header.split(" ")[1]` trong router.

---

## 9. Security Audit

* [x] `.env` được git ignore và không bị theo dõi bởi VCS.
* [x] Không có database credentials hay secret key nào bị commit vào git.
* [x] Không lưu trữ mật khẩu người dùng trong Data Platform DB.
* [x] Không lưu access token hay refresh token vào Database cục bộ.
* [x] Không truyền biến môi trường nhạy cảm sang Frontend client (`NEXT_PUBLIC_*` chỉ chứa API base URL).
* [x] Frontend không gọi trực tiếp Manage Service URL; mọi truy vấn đều qua Data Platform API.
* [x] Endpoint `/api/v1/users` được bảo vệ bằng `CurrentUser`.
* [x] Không tồn tại các endpoint ghi đè (write endpoints) cho Users.

---

## 10. Automated Tests

Đã thực thi toàn bộ **25 unit & API integration test cases**:
```text
tests/test_auth_client.py::test_auth_client_build_url PASSED             [  4%]
tests/test_auth_client.py::test_auth_client_login_success PASSED         [  8%]
tests/test_auth_client.py::test_auth_client_login_invalid_credentials PASSED [ 12%]
tests/test_auth_client.py::test_auth_client_get_me_success PASSED        [ 16%]
tests/test_auth_client.py::test_auth_client_get_me_expired_token PASSED  [ 20%]
tests/test_manage_client.py::test_manage_client_build_url PASSED         [ 24%]
tests/test_manage_client.py::test_manage_client_list_users_paginated PASSED [ 28%]
tests/test_manage_client.py::test_manage_client_list_users_list_envelope PASSED [ 32%]
tests/test_manage_client.py::test_manage_client_unauthorized PASSED      [ 36%]
tests/test_manage_client.py::test_manage_client_timeout PASSED           [ 40%]
tests/test_last_login.py::test_first_login_creates_last_login_record PASSED [ 44%]
tests/test_last_login.py::test_second_login_updates_existing_record PASSED [ 48%]
tests/test_last_login.py::test_failed_login_does_not_update_last_login PASSED [ 52%]
tests/test_db_failure_does_not_break_login PASSED                        [ 56%]
tests/test_repository_model_conversion_and_batch_query PASSED           [ 60%]
tests/test_users_backend.py::test_list_users_use_case_merge_last_login PASSED [ 64%]
tests/test_users_backend.py::test_list_users_use_case_empty_users PASSED [ 68%]
tests/test_users_backend.py::test_list_users_use_case_manage_failure PASSED [ 72%]
tests/test_users_backend.py::test_list_users_use_case_pagination_and_search_forwarding PASSED [ 76%]
tests/test_users_backend.py::test_api_get_users_unauthenticated PASSED   [ 80%]
tests/test_users_backend.py::test_api_get_users_authenticated_success PASSED [ 84%]
tests/test_auth_completion.py::test_get_me_single_remote_call PASSED     [ 88%]
tests/test_auth_completion.py::test_get_me_unauthenticated PASSED        [ 92%]
tests/test_auth_completion.py::test_logout_endpoint PASSED               [ 96%]
tests/test_auth_completion.py::test_get_me_does_not_update_last_login PASSED [100%]
============================= 25 passed in 10.54s =============================
```

---

## 11. Manual E2E Tests Evidence Table

| Bước | Kịch bản kiểm thử | Kết quả mong đợi | Thực tế | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| 1 | `POST /api/v1/auth/login` | Nhận token, lưu vào `localStorage` | Token nhận về và lưu key `dut_ai_token` | **PASS** |
| 2 | Last login persistence | Ghi nhận timestamp vào `user_login_metadata` | Cập nhật chính xác `last_login_at` | **PASS** |
| 3 | `GET /api/v1/auth/me` | 1 remote call, trả về thông tin user | Gọi External Auth đúng 1 lần (`call_count == 1`) | **PASS** |
| 4 | Protected route access | Truy cập `/dashboard` khi đã đăng nhập | Hiển thị thông tin cá nhân của user | **PASS** |
| 5 | `GET /api/v1/users` | Trả về danh sách user từ Manage API | Parse envelope và dữ liệu an toàn | **PASS** |
| 6 | Merge Last Login | Ghép nối `last_login_at` hoặc null | User có đăng nhập có timestamp, user chưa đăng nhập null | **PASS** |
| 7 | UI `/users` rendering | Bảng người dùng Read-only, search, phân trang | Bảng sạch đẹp, không có nút thêm/sửa/xóa | **PASS** |
| 8 | `POST /api/v1/auth/logout` | Xóa session, xóa token, chuyển về login | Token bị xóa, query cache cleared, về `/login` | **PASS** |
| 9 | Unauthenticated route guard | Truy cập trực tiếp `/users` khi chưa đăng nhập | Bị chặn và chuyển hướng ngay về `/login` | **PASS** |

---

## 12. Build & Static Analysis

* **Backend Formatting (`ruff format --check .`)**: `168 files already formatted`.
* **Backend Linter (`ruff check .`)**: `All checks passed!`.
* **Frontend TypeScript (`npm run typecheck`)**: `tsc --noEmit` -> `0 errors`.
* **Frontend Production Build (`npm run build`)**: Biên dịch thành công với Turbopack trong 39.7s. Route `/users` prerendered tĩnh chuẩn mực.

---

## 13. Performance Checks

* **Zero N+1 Query**: Khi có $N$ users từ Manage API, chỉ thực thi đúng **1 query SQL duy nhất** qua `WHERE user_id IN (...)`. Nếu danh sách rỗng, hoàn toàn không truy vấn database.
* **Single Remote Call for `/me`**: Loại bỏ cuộc gọi lặp lại trong `get_me`.
* **Debounced Search**: Frontend trì hoãn 350ms trước khi gửi request tìm kiếm, giảm thiểu tải mạng lên server.

---

## 14. Bugs Found & Fixed During Checkpoints

1. **Duplicate `/auth/me` call**: Fix bằng cách trả về trực tiếp `current_user: CurrentUser`.
2. **Missing `/auth/logout` endpoint**: Thêm endpoint `POST /api/v1/auth/logout` với DTO `LogoutResponseDTO`.
3. **Legacy Local JWT ambiguity**: Loại bỏ `get_current_user_payload` dùng local secret key giải mã external token.
4. **Missing Read-only User UI**: Xây dựng toàn bộ feature [web/src/features/users/](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/features/users/) và trang `/users`.
5. **No Route Guard on Frontend**: Bổ sung `AuthGuard` trong `ProtectedLayout` và 401 response interceptor trong `api.ts`.
6. **Hardcoded URLs & legacy token key**: Chuẩn hóa biến cấu hình và đổi `project_boilerplate_token` thành `dut_ai_token`.

---

## 15. Remaining Known Issues / Out of Scope

* **Refresh Token**: External Auth Provider hiện tại không hỗ trợ token refresh (`/auth/refresh`). Khi token hết hạn, hệ thống chuyển hướng người dùng đăng nhập lại an toàn (`OUT OF SCOPE / PROVIDER LIMITATION`).
* **Manage API External Reachability**: Đã xác minh ở Checkpoint 0 & 1 là endpoint `https://manage.dutai.io.vn/api/v1/users` reachable và trả về `401 Unauthorized` khi không có token hợp lệ.

---

## 16. Files Changed Across All Checkpoints (CP0–CP6)

### New Files Created
1. [modules/identity/client/manage_client.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/client/manage_client.py) — HTTP client gọi Manage Users API.
2. [modules/identity/dtos/manage_dtos.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/dtos/manage_dtos.py) — DTOs cho Manage Users response.
3. [modules/identity/dtos/user_dtos.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/dtos/user_dtos.py) — DTOs nội bộ `UserReadDTO`, `UsersListResponseDTO`.
4. [modules/identity/models/user_login.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/models/user_login.py) — SQLAlchemy model `UserLoginMetadataModel`.
5. [modules/identity/repository/user_login_repository.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/repository/user_login_repository.py) — Repository PostgreSQL UPSERT & batch query.
6. [modules/identity/use_cases/list_users.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/use_cases/list_users.py) — UseCase hợp nhất Manage data & Last Login.
7. [migrations/versions/008_create_user_login_metadata.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/migrations/versions/008_create_user_login_metadata.py) — Migration tạo bảng `user_login_metadata`.
8. [apps/api/routers/users.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/apps/api/routers/users.py) — FastAPI router `GET /api/v1/users` (Read-only).
9. [web/src/features/users/*](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/features/users/) — Toàn bộ feature Quản lý người dùng Frontend (types, api, hooks, components).
10. [web/src/app/(protected)/users/page.tsx](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/app/%28protected%29/users/page.tsx) — Route `/users`.
11. [tests/test_auth_client.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/tests/test_auth_client.py) — Unit tests AuthClient.
12. [tests/test_manage_client.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/tests/test_manage_client.py) — Unit tests ManageClient.
13. [tests/test_last_login.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/tests/test_last_login.py) — Unit tests Last Login persistence.
14. [tests/test_users_backend.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/tests/test_users_backend.py) — Unit & API tests User Management backend.
15. [tests/test_auth_completion.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/tests/test_auth_completion.py) — Unit & API tests Auth completion.
16. [docs/checkpoints/*](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/docs/checkpoints/) — 7 báo cáo checkpoint chi tiết từ CP0 đến CP6.

### Modified Files
1. [core/config/app.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/core/config/app.py) — Thêm `manage_server_url`, `external_api_timeout`.
2. [modules/identity/client/auth_client.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/client/auth_client.py) — Chuẩn hóa URL builder và timeout.
3. [modules/identity/domain/entities.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/domain/entities.py) — Thêm `UserLoginMetadataEntity`.
4. [modules/identity/domain/interfaces.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/domain/interfaces.py) — Thêm `IUserLoginRepository`.
5. [modules/identity/di.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/di.py) — Cấu hình DI cho AuthClient, ManageClient, UserLoginRepo, ListUsersUseCase.
6. [modules/identity/use_cases/login.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/use_cases/login.py) — Ghi nhận `last_login_at` khi login thành công.
7. [apps/api/routers/identity.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/apps/api/routers/identity.py) — Fix duplicate `/me`, thêm `/logout`.
8. [apps/api/deps/auth.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/apps/api/deps/auth.py) — Dọn dẹp legacy local JWT, chuẩn hóa `CurrentUser`.
9. [apps/api/main.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/apps/api/main.py) — Mount `users_router`.
10. [web/src/lib/api.ts](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/lib/api.ts) — Thêm 401 response interceptor.
11. [web/src/lib/auth-token.ts](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/lib/auth-token.ts) — Chuẩn hóa key `dut_ai_token`.
12. [web/src/app/(protected)/layout.tsx](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/app/%28protected%29/layout.tsx) — Thêm client-side Auth Guard.
13. [web/src/components/layout/app-shell.tsx](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/components/layout/app-shell.tsx) — Bổ sung mục "Người dùng" và "Đăng xuất" trên Sidebar.
14. [docs/auth-user-management-progress.md](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/docs/auth-user-management-progress.md) — Cập nhật thành báo cáo tổng kết hoàn tất 100%.

---

## 17. Definition of Done Checklist

* [x] **Full E2E Authentication Flow**: Login -> Lưu last login -> CurrentUser authenticated -> Dashboard -> Logout -> Chặn unauthenticated.
* [x] **User Management Read-Only**: Chỉ đọc qua `GET /api/v1/users`, không có CRUD, UI sạch sẽ, có pagination & debounced search.
* [x] **Last Login Persistence**: Bảng `user_login_metadata` hoạt động chuẩn xác, batch merge $O(1)$, zero N+1 query.
* [x] **Clean Architecture & Zero Hardcode**: Sử dụng Dishka DI, không gọi URL ngoài từ Frontend, không lộ secret key.
* [x] **Quality Gates**: 25/25 Pytest passed, Ruff lint/format passed, TypeScript typecheck passed, Next.js production build passed.

---

## 18. Final Result

**DONE (100% HOÀN THÀNH)**
