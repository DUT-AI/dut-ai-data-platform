---

description: "Task list for DUT AI SSO resource-server integration under /data and deploy"
---

# Tasks: Data Platform tham gia DUT AI SSO qua Workspace (`/data`) và deploy

**Input**: Các tài liệu thiết kế trong `/specs/005-sso-manage-integration/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/

**Tests**: Có. SC-003 yêu cầu test tự động.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Chạy song song được (khác file, không phụ thuộc nhau)
- **[Story]**: User story mà task thuộc về (US1–US5)

---

## Phase 1: Setup

- [X] T001 Tạo branch `feat/sso-manage-integration` từ `dev`, rồi đăng ký `specs/005-sso-manage-integration` trong `.specify/feature.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T002 Viết lại `core/config/auth.py`:
  - thêm `auth_refresh_cookie_name`, `auth_cookie_domain` (chuỗi rỗng → `None`), `auth_local_login_enabled`, `activity_record_interval_minutes`;
  - bỏ `jwt_expire_minutes`, `auth_cookie_max_age`, `get_me_url`, `me_url`.
- [X] T003 Viết lại `core/security/jwt.py`:
  - chỉ còn `decode_sso_token(token, expected_type)` và `decode_access_token`;
  - bắt buộc `exp`, `sub`, `type`;
  - bỏ `create_access_token`.

  Cập nhật `core/security/__init__.py` cho khớp.
- [X] T004 [P] Tạo `modules/identity/services/sso_claims.py` với `auth_user_from_claims`: `sub` là int dương, `roles` → `role_names`, `avatar` → `avatar_url`. Export trong `services/__init__.py`.
- [X] T005 [P] Tạo `modules/identity/client/http.py` với `build_manage_http_client()` (jar không lưu cookie). Dùng nó trong `di.py`, trong `AuthClient.client` và `ManageClient.client`.

---

## Phase 3: User Story 1 - Vào thẳng Data Platform khi đã đăng nhập Workspace (P1) 🎯 MVP

**Goal**: API chấp nhận access token của Manage và từ chối mọi token khác.

**Independent Test**: `tests/test_auth_completion.py::test_me_*`

- [X] T006 [US1] Viết lại `apps/api/deps/auth.py`: lấy token từ cookie, nếu không có thì từ Bearer; gọi `decode_access_token` rồi `auth_user_from_claims`; lỗi thì trả 401 kèm `WWW-Authenticate`.
- [X] T007 [US1] Thêm `record_activity(user_id, seen_at, not_before)` vào `IUserLoginRepository` và `SqlUserLoginRepository`. Dùng upsert có điều kiện `WHERE last_login_at < not_before`.
- [X] T008 [US1] Viết lại `GetMeUseCase(login_repo)` để ghi hoạt động có throttle. Route `GET /auth/me` gọi use case này.
- [X] T009 [US1] Tạo `tests/auth_tokens.py` (`mint_manage_token`). Thêm các test `/me` (cookie, Bearer, refresh dùng làm access, hết hạn, sai secret, `sub` không hợp lệ, không có token) và test role lấy từ claim `roles`.

---

## Phase 4: User Story 2 - Chưa đăng nhập thì về trang đăng nhập chung (P1)

**Goal**: Web chạy dưới `/data`, gặp 401 thì chuyển tới SSO, production không còn form đăng nhập.

**Independent Test**: `pnpm build` pass; trên prod, mở `/data/projects` khi chưa đăng nhập thì bị chuyển tới `/manage/login`.

- [X] T010 [US2] Sửa `web/next.config.ts`: `basePath: "/data"`, `env.APP_BASE_PATH`, rewrite `/api/:path*` → `${API_PROXY_ORIGIN}/api/:path*`, `proxyClientMaxBodySize: "100mb"`.
- [X] T011 [US2] Tạo `web/src/lib/auth-urls.ts` gồm `BASE_PATH`, `SSO_LOGIN_URL`, `SSO_LOGOUT_REDIRECT_URL`, `LOCAL_LOGIN_ENABLED`, `withBasePath`, `redirectToSsoLogin`.
- [X] T012 [US2] Trong `web/src/lib/api.ts`, `web/src/app/page.tsx` và `web/src/app/(protected)/layout.tsx`: khi gặp 401 hoặc chưa đăng nhập, gọi `redirectToSsoLogin()`.
- [X] T013 [US2] Trong `web/src/app/login/page.tsx`: khi local login tắt thì redirect tới SSO.
- [X] T014 [P] [US2] Thêm `withBasePath` cho `workspace-header.tsx` (`window.location.href`) và `create-project-view.tsx` (ảnh template).
- [X] T015 [US2] Route `POST /auth/login` trả 404 khi `AUTH_LOCAL_LOGIN_ENABLED=false`. Thêm test.

---

## Phase 5: User Story 3 - Đăng xuất toàn hệ thống (P2)

- [X] T016 [US3] Tạo `apps/api/auth_cookies.py` (`set_sso_cookies`, `clear_sso_cookies`, có `Domain` khi được cấu hình). Route `POST /auth/logout` dùng `clear_sso_cookies`.
- [X] T017 [US3] Trong `web/src/features/auth/hooks/use-auth-queries.ts`: sau khi logout (dù thành công hay lỗi) thì `window.location.assign(SSO_LOGOUT_REDIRECT_URL)`.
- [X] T018 [US3] Thêm test: logout xoá đúng 2 cookie với `Domain=.dutai.io.vn` và `Secure`.

---

## Phase 6: User Story 4 - Chạy local (P2)

- [X] T019 [US4] Viết lại `LoginUseCase`:
  - verify access và refresh token của Manage;
  - trả `SsoSessionDTO` kèm `exp` của cả hai;
  - ghi `upsert_last_login`, không nuốt lỗi.

  Bỏ `AuthClient.get_me` và `IAuthClient.get_me`.
- [X] T020 [US4] Thêm `SsoSessionDTO` vào `modules/identity/dtos/auth_dtos.py`. Đổi `LoginResponseDTO` thành shape user. Thêm `refresh_token` bắt buộc vào `TokenResponseDTO`.
- [X] T021 [US4] Cập nhật `tests/test_last_login.py`:
  - dùng token mint;
  - đổi tên 2 test lỗi;
  - thêm test throttle (in-memory và SQLite).
- [X] T022 [P] [US4] Đổi copy của form login và cập nhật `web/src/features/auth/services/auth-service.ts` (login trả `User`, xoá `TokenResponse`).
- [X] T023 [P] [US4] Cập nhật `web/.env.example` với các biến local và production.

---

## Phase 7: User Story 5 - Deploy (P1)

- [X] T024 [US5] Sửa `docker-compose.yml`:
  - bỏ `ports` của `api`;
  - `web` publish `127.0.0.1:${WEB_HOST_PORT:-3036}:3000`;
  - không sửa `db`/`redis`/`minio`/`createbuckets`/`volumes`/`networks`.
- [X] T025 [P] [US5] `api` publish `127.0.0.1:${API_HOST_PORT:-8000}:8000` trong `docker-compose.yml`; server đặt `API_HOST_PORT=8010`.
- [X] T026 [P] [US5] Thêm `COPY migrations`, `COPY alembic.ini` vào `apps/api/Dockerfile`.
- [X] T027 [P] [US5] Cập nhật `.env.example` với các biến SSO, `WEB_HOST_PORT=3036`, `API_HOST_PORT` (server `8010`), `MINIO_PUBLIC_ENDPOINT`, `MANAGE_API_TOKEN`.
- [X] T028 [US5] `ManageClient` trả 502 khi upstream trả 401/403. Sửa `tests/test_manage_client.py` cho khớp.
- [X] T029 [US5] Thêm `tests/test_identity_http_client.py` để kiểm tra client không lưu cookie.
- [ ] T030 [US5] Deploy lên server theo `quickstart.md` §4: snapshot, diff các service dùng chung, rồi `up -d --no-deps api web`.
- [ ] T031 [US5] Tạo public hostname `dataplatform.dutai.io.vn → http://localhost:3036`.
- [ ] T032 [US5] Gửi `contracts/workspace-gateway-handoff.md` cho chủ nhiệm (route `/data` trong Worker).
- [ ] T033 [US5] Chạy smoke test 1–6 (`quickstart.md` §5).

---

## Phase 8: Polish & Cross-Cutting

- [X] T034 Cập nhật `tests/test_auth_client.py` (bỏ test `get_me`) và `tests/test_users_backend.py` (đổi sang `mint_manage_token`).
- [ ] T035 Chạy các gate: `uv run pytest tests/ -q`, `uv run ruff check .`, `uv run ruff format --check` (chỉ file đã sửa), `pnpm lint && pnpm typecheck && pnpm build`, và quét `alert|confirm|prompt|transition-all`.
- [ ] T036 Kiểm tra trực quan login local ở 390 px và 1440 px. Để lại cho bước review.

## Dependencies

- Phase 2 → Phase 3 → (Phase 4, Phase 5, Phase 6 chạy song song được) → Phase 7 → Phase 8.
- T030–T033 cần PR đã merge, cần `SECRET_KEY` và `MANAGE_API_TOKEN` của Manage, và cần chốt DB production dùng trên server.
