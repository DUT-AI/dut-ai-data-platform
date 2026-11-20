# Implementation Plan: Data Platform tham gia DUT AI SSO qua Workspace (`/data`) và deploy

**Branch**: `feat/sso-manage-integration` | **Date**: 2026-11-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-sso-manage-integration/spec.md`

## Summary

Data Platform trở thành Resource Server của DUT AI SSO.

- **API**: verify cục bộ access token của Manage (HS256, secret chung, `type=access`) và không ký token nữa. Logout xoá cặp cookie chung trên `.dutai.io.vn`. `/auth/me` ghi hoạt động của người dùng, tối đa một lần mỗi 15 phút.
- **Login cục bộ**: chỉ còn cho dev, nằm sau cờ `AUTH_LOCAL_LOGIN_ENABLED`, và giữ nguyên token gốc của Manage.
- **Web**: chạy dưới `basePath=/data`, gọi API cùng origin qua Next rewrite `/data/api/*` → `http://api:8000/api/*`. Gặp 401 thì chuyển tới trang đăng nhập chung của Workspace.
- **Deploy**: API không publish ra host, vì cổng 8000 là của Manage. Web chạy ở `127.0.0.1:3036`. Runbook bảo vệ các container dùng chung (MinIO dùng chung với Meetly).

## Technical Context

- **Language/Version**: Python 3.12 (backend), TypeScript / Next.js 16.2 (web)
- **Primary Dependencies**: FastAPI, Dishka, SQLAlchemy async, PyJWT, httpx; axios, TanStack Query
- **Storage**: PostgreSQL. Không đổi schema. `user_login_metadata.last_login_at` được ghi bằng upsert có điều kiện.
- **Testing**: pytest + pytest-asyncio (SQLite in-memory qua `tests/conftest.py`); eslint, tsc, `next build`
- **Target Platform**: Docker Compose trên `dutai-minipc`, đi qua Cloudflare Tunnel và Cloudflare Worker của Workspace
- **Project Type**: Web application, gồm modular monolith (`modules/*`) và frontend `web/`
- **Performance Goals**: Verify JWT trong RAM, không có remote call nào trên mỗi request. Ghi DB của `/auth/me` tối đa 1 lần / 15 phút / user.
- **Constraints**:
  - Không sửa repo Manage và Workspace.
  - Không tạo lại `db`/`redis`/`minio`.
  - Không publish cổng 8000.
  - Body đi qua rewrite tối đa 100MB.
- **Scale/Scope**: khoảng 30 file. 4 module mới (`sso_claims.py`, `client/http.py`, `apps/api/auth_cookies.py`, `web/src/lib/auth-urls.ts`), 2 file test mới, 1 file compose override.

## Constitution Check

| Gate | Status | Evidence |
|---|---|---|
| I. Domain thuần | PASS | Không đụng `domain/` ngoài interface. Map claims nằm trong `modules/identity/services/` |
| II. User id là số nguyên, không có fallback | PASS | `int(sub) > 0` hoặc 401. Không còn union `int \| str` |
| III. Ranh giới transaction rõ ràng, không nuốt lỗi | PASS | Bỏ `except Exception` quanh ghi `last_login_at`. Ghi bằng một câu SQL trong session của request |
| IV. DI và pool kết nối singleton | PASS | `httpx.AsyncClient` vẫn ở scope APP qua Dishka, nay dùng jar không lưu cookie. Không tạo client mới cho mỗi request |
| V. Router tách theo subdomain | PASS | Auth vẫn ở `apps/api/routers/identity.py`. Helper cookie tách ra `apps/api/auth_cookies.py` |
| Testing gate `uv run pytest tests/ -q` | PENDING | Chạy khi implement (`quickstart.md` §2) |
| Frontend rulebook: Purpose Gate, scoped prettier/eslint/tsc/build, quét `alert\|confirm\|prompt\|transition-all` | PASS (thiết kế) | UI chỉ đổi một dòng copy ở form login local. Còn lại là điều hướng và URL |
| Frontend rulebook: kiểm tra trực quan ở 390/1440 px | NOT RUN | Không đổi layout. Kiểm tra ở bước review |

## Project Structure

### Documentation (this feature)

```text
specs/005-sso-manage-integration/
├── spec.md
├── plan.md
├── research.md
├── quickstart.md
├── tasks.md
├── contracts/
│   ├── auth-sso.md
│   └── workspace-gateway-handoff.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
core/config/auth.py                         # SSO settings (secret, cookie domain, local-login flag, activity interval)
core/security/jwt.py, __init__.py           # verify only: decode_sso_token / decode_access_token
apps/api/auth_cookies.py                    # set/clear shared SSO cookies
apps/api/deps/auth.py                       # CurrentUser from Manage access token
apps/api/routers/identity.py                # /login (flagged), /me, /logout
modules/identity/
├── client/http.py                          # cookieless httpx client factory
├── client/auth_client.py                   # login only
├── client/manage_client.py                 # upstream 401/403 → 502
├── services/sso_claims.py                  # claims → AuthUser
├── repository/user_login_repository.py     # record_activity (throttled upsert)
├── use_cases/login.py, get_me.py
├── dtos/auth_dtos.py, domain/interfaces.py, di.py
web/next.config.ts                          # basePath /data, API rewrite, body limit
web/src/lib/auth-urls.ts, api.ts            # SSO URLs, withBasePath, 401 redirect
web/src/app/{page.tsx,(protected)/layout.tsx,login/page.tsx}
web/src/features/auth/{hooks,services,types,components/login-form.tsx}
web/src/features/annotation/components/workspace/workspace-header.tsx
web/src/features/projects/components/create-project-view.tsx
docker-compose.yml, apps/api/Dockerfile, .env.example, web/.env.example
tests/auth_tokens.py, test_auth_completion.py, test_last_login.py, test_identity_http_client.py,
tests/test_auth_client.py, test_manage_client.py, test_users_backend.py
```

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Next rewrite `/data/api` → `api:8000` | API cùng origin, không cần CORS, không cần publish cổng API | Tunnel route theo path bắt FastAPI bỏ prefix. Subdomain API riêng cần CORS, mà Worker chỉ route theo path |
| Login local sau cờ | Cookie `.dutai.io.vn` không tới được `localhost` | Bỏ hẳn login local thì dev không chạy được trên máy |
| Ghi `last_login_at` có throttle trên `/me` | Production không còn bước login ở Data Platform. Không ghi ở đây thì cột "lần đăng nhập cuối" luôn trống | Ghi mỗi request thì tải DB lớn. Không ghi thì mất tính năng hiện có |
| Jar không lưu cookie | Client dùng chung rò rỉ phiên người dùng sang lời gọi service | Tạo client mới mỗi request vi phạm Constitution IV |
