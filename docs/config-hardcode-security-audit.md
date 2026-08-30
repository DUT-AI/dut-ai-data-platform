# Config / Hardcode / Auth Cookie Security Audit

Báo cáo tổng hợp kiểm toán bảo mật, rà soát mã cứng (hardcode audit), dọn dẹp credentials và chuyển đổi lưu trữ Access Token sang **HttpOnly Cookie** trong toàn bộ repository **DUT AI Data Platform**.

---

## 1. Scope

* Rà soát toàn bộ mã nguồn Python, TypeScript, Docker Compose, tệp tin cấu hình `.env.example`, và tài liệu `docs/`.
* Chuyển đổi toàn diện cơ chế lưu trữ Authentication Token từ `localStorage` sang **HttpOnly Cookie** do Backend phát hành.
* Tái cấu trúc cơ chế quản lý Token: Chuyển từ việc dùng trực tiếp Manage Token sang **Data Platform tự phát hành và xác thực JWT nội bộ** (Platform's Own JWT).
* Đảm bảo không còn real secrets, real private IPs, hay production URLs bị commit trong tracked source code.

---

## 2. Previous Config Architecture

* Các URL dịch vụ (như `manage.dutai.io.vn`, `dataplatforms3.dutai.io.vn`) từng bị đặt làm giá trị mặc định trực tiếp trong mã nguồn (`core/config/app.py`, `core/config/s3.py`).
* Access token của Manage Server được lưu trực tiếp vào `localStorage` của trình duyệt dưới khóa `dut_ai_token`.
* Mọi protected request trên Backend đều gọi HTTP từ xa sang Manage Server `GET /api/v1/auth/me` để kiểm tra danh tính.
* Tài liệu `docs/checkpoints/auth-user-cp0-environment.md` từng ghi nhận IP nội bộ `100.84.65.48` và chuỗi kết nối database có chứa mật khẩu.

---

## 3. Findings

| File | Finding | Type | Severity | Action |
| :--- | :--- | :--- | :--- | :--- |
| `docs/checkpoints/auth-user-cp0-environment.md` | Chứa database connection URL thật kèm password và IP `100.84.65.48` | `DATABASE` | **CRITICAL** | `REPLACE_WITH_PLACEHOLDER` (`<redacted>`) |
| `core/config/s3.py` | Hardcoded default production endpoint `https://dataplatforms3.dutai.io.vn` | `URL` | **HIGH** | `MOVE_TO_ENV` / Thay default bằng `http://localhost:9000` |
| `core/config/app.py` | Hardcoded default production URL `https://manage.dutai.io.vn/api/v1` | `URL` | **HIGH** | `MOVE_TO_ENV` / Thay default bằng `http://localhost:8000/api/v1` |
| `.env.example` | Chứa domain thật `manage.dutai.site` và `manage.dutai.io.vn` | `URL` | **MEDIUM** | `REPLACE_WITH_PLACEHOLDER` (`example.com`) |
| `web/src/lib/auth-token.ts` | Lưu trữ access token trong `localStorage` | `FRONTEND_SECRET` | **HIGH** | `REMOVE` (Xóa bỏ tệp tin dead code) |
| `core/telemetry/telemetry.py` | Đọc `os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")` rải rác | `SERVICE_CONFIG` | **LOW** | `MOVE_TO_ENV` (Tích hợp vào `AppSettings`) |
| `tests/test_storage_uri.py` | Chứa domain test `dataplatforms3.dutai.io.vn` và key giả lập `dutai123` | `TEST_FIXTURE` | **LOW** | `REPLACE_WITH_PLACEHOLDER` (`s3.example.com`) |
| `tests/test_manage_client.py` | Chứa domain test `manage.dutai.io.vn` | `TEST_FIXTURE` | **LOW** | `REPLACE_WITH_PLACEHOLDER` (`manage.example.com`) |
| `tests/test_auth_client.py` | Chứa domain test `manage.dutai.io.vn` | `TEST_FIXTURE` | **LOW** | `REPLACE_WITH_PLACEHOLDER` (`auth.example.com`) |

---

## 4. Config Refactors

1. **`core/config/app.py`**:
   * Thêm các thông số Cookie: `auth_cookie_name`, `auth_cookie_secure`, `auth_cookie_samesite`, `auth_cookie_max_age`.
   * Thêm `manage_api_token: str | None = None` phục vụ kết nối Manage API khi cần.
   * Thêm `otel_exporter_otlp_endpoint: str | None = None` quản lý tập trung trong `AppSettings`.
   * Giá trị mặc định của `auth_server_url` và `manage_server_url` được chuyển thành safe localhost / placeholder.
2. **`core/config/s3.py`**:
   * Giá trị mặc định của `minio_endpoint` chuyển thành `http://localhost:9000`.
3. **`core/telemetry/telemetry.py`**:
   * Loại bỏ `os.getenv`, đọc thông qua `app_settings.otel_exporter_otlp_endpoint`.

---

## 5. `.env` Final State

Các biến môi trường được chuẩn hóa trong `.env` (chỉ liệt kê tên biến, không tiết lộ giá trị):
* `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`
* `REDIS_URL`
* `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`
* `AUTH_COOKIE_NAME`, `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_SAMESITE`, `AUTH_COOKIE_MAX_AGE`
* `AUTH_SERVER_URL`, `MANAGE_SERVER_URL`, `EXTERNAL_API_TIMEOUT`, `MANAGE_API_TOKEN`
* `MINIO_ENDPOINT`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `DEFAULT_BUCKET`, `MINIO_SECURE`
* `LABEL_STUDIO_URL`, `LABEL_STUDIO_INTERNAL_URL`, `LABEL_STUDIO_API_KEY`, `LABEL_STUDIO_USERNAME`, `LABEL_STUDIO_PASSWORD`, `LABEL_STUDIO_HOST`, `LABEL_STUDIO_PORT`, `PLATFORM_WEBHOOK_URL`
* `API_HOST`, `API_PORT`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_BASE_URL`

---

## 6. `.env.example` Final State

* Toàn bộ credentials và passwords thật đã được thay thế bằng safe placeholders: `your_postgres_password`, `your_minio_password`, `your_label_studio_api_key`.
* Toàn bộ external URLs đã được chuyển thành các domain ví dụ an toàn: `https://auth.example.com/api/v1`, `https://manage.example.com/api/v1`, `http://localhost:8000`.
* File `.env.example` được cập nhật đầy đủ 100% các biến môi trường của hệ thống và được theo dõi trong Git.

---

## 7. Docker Compose Cleanup

* Tất cả các dịch vụ trong `docker-compose.yml` (`db`, `minio`, `label-studio`, `createbuckets`) đều sử dụng cơ chế biến nội suy môi trường `${VARIABLE}`.
* Không có mật khẩu hay secret nào bị nhúng cứng trong `docker-compose.yml`.

---

## 8. Backend Hardcode Cleanup

* Loại bỏ toàn bộ URL hardcoded domain `manage.dutai.io.vn` và `dataplatforms3.dutai.io.vn` khỏi application code và test suites.
* Tách biệt cấu hình ngữ nghĩa giữa `AUTH_SERVER_URL` và `MANAGE_SERVER_URL`.
* Cập nhật [core/security/jwt.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/core/security/jwt.py) thành hệ thống cấp và kiểm tra JWT chính thức của Data Platform.

---

## 9. Frontend Hardcode Cleanup

* Xóa bỏ hoàn toàn tệp tin `web/src/lib/auth-token.ts`.
* Không còn bất kỳ thao tác `localStorage.setItem` hay `localStorage.getItem` nào liên quan đến Authentication Token.
* `web/src/lib/api.ts`: Kích hoạt `withCredentials: true`, loại bỏ Axios request interceptor inject Bearer token từ `localStorage`.

---

## 10. Authentication Storage Migration

* **Trước (Before)**:
  * Backend trả về `access_token` của Manage Server trong JSON body.
  * Frontend nhận và lưu vào `localStorage.setItem("dut_ai_token", token)`.
  * Rủi ro: Bị tấn công XSS đánh cắp token; token bị phơi bày cho mọi script client-side.
* **Sau (After)**:
  * Backend xác thực qua Manage Server -> Tạo Data Platform JWT riêng (`platform_access_token`).
  * Backend thiết lập `Set-Cookie: access_token=...; HttpOnly; SameSite=Lax; Path=/`.
  * Trình duyệt tự động lưu trữ và gửi kèm cookie trong các request tiếp theo.
  * JavaScript client-side **hoàn toàn không thể đọc hay can thiệp vào token**.

---

## 11. Cookie Security Configuration

* **`HttpOnly=True`**: Chống truy cập qua `document.cookie` (ngăn chặn rò rỉ qua XSS).
* **`Secure`**: Được điều khiển bởi cấu hình `settings.auth_cookie_secure` (`False` cho môi trường dev local HTTP, `True` cho môi trường production HTTPS).
* **`SameSite=Lax`**: Bảo vệ chống tấn công Cross-Site Request Forgery (CSRF).
* **`Path=/`**: Áp dụng cho toàn bộ đường dẫn API của Data Platform.
* **`Max-Age=86400`**: Thời hạn cookie đồng bộ với hạn sử dụng của JWT.

---

## 12. CurrentUser Auth Flow

```text
Request (Browser mang HttpOnly Cookie hoặc API Client mang Bearer Header)
  ↓
apps/api/deps/auth.py: get_current_user
  ↓
Trích xuất token ưu tiên từ request.cookies[settings.auth_cookie_name]
  ↓
Gọi core.security.jwt.decode_access_token(platform_access_token)
  ↓
Xác thực chữ ký số bằng settings.jwt_secret_key và kiểm tra hạn sử dụng (LOCAL)
  ↓
Tạo thực thể AuthUser (id=sub, email, name, role_names)
  ↓
0 NETWORK CALLS SANG MANAGE SERVER!
```

---

## 13. Logout Flow

```text
Frontend POST /api/v1/auth/logout
  ↓
apps/api/routers/identity.py: response.delete_cookie(settings.auth_cookie_name, path="/")
  ↓
Trình duyệt xóa bỏ / hết hạn HttpOnly Cookie
  ↓
Frontend xóa React Query cache và điều hướng về /login
```

---

## 14. Secret Leak Audit

* **Git Tracking**:
  * `.env`: **IGNORED** (Đã xác minh qua `git check-ignore .env` và `git ls-files .env` -> không được theo dõi trong VCS).
  * `.env.example`: **TRACKED** (Chỉ chứa placeholder an toàn).
* **Known Secrets Scan**:
  * Known DB credentials: **NOT FOUND** trong application code.
  * Known MinIO credentials: **NOT FOUND** trong application code.
  * Known Label Studio keys: **NOT FOUND** trong application code.
  * Hardcoded production URLs: **NOT FOUND** trong application code.
  * Auth token trong localStorage: **NOT FOUND** (0 kết quả).

---

## 15. Tests

Toàn bộ **46 test cases** tự động đã vượt qua thành công:
* `tests/test_annotation_full.py`: 1/1 PASS
* `tests/test_auth_client.py`: 5/5 PASS
* `tests/test_auth_completion.py`: 8/8 PASS (Bao gồm test login cấp cookie, CurrentUser xác thực cookie cục bộ, CurrentUser hỗ trợ Bearer header, expired token 401, logout xóa cookie)
* `tests/test_dataset_full.py`: 1/1 PASS
* `tests/test_domain.py`: 2/2 PASS
* `tests/test_health.py`: 3/3 PASS
* `tests/test_last_login.py`: 6/6 PASS (Bao gồm test login cấp Platform JWT, không cấp Manage token, lỗi Manage /me không cập nhật last login)
* `tests/test_manage_client.py`: 5/5 PASS
* `tests/test_ontology_full.py`: 1/1 PASS
* `tests/test_projects_full.py`: 1/1 PASS
* `tests/test_storage_uri.py`: 6/6 PASS
* `tests/test_users_backend.py`: 7/7 PASS (Bao gồm test bảo vệ ranh giới: Platform token không bị rò rỉ sang Manage API)

---

## 16. Build & Static Analysis

* **Backend Linter (`ruff check .`)**: `All checks passed!` (0 errors).
* **Backend Formatter (`ruff format --check .`)**: `170 files already formatted`.
* **Frontend Typecheck (`tsc --noEmit`)**: `0 errors`.
* **Frontend Production Build (`next build`)**: Biên dịch thành công với Turbopack trong `23.5s`, tất cả route tĩnh và động tối ưu.

---

## 17. Manual Smoke Test

1. Truy cập `http://localhost:3000/login` -> Đăng nhập thành công.
2. Kiểm tra DevTools -> Application -> Cookies: Thấy cookie `access_token` được gán cờ `HttpOnly`.
3. Kiểm tra DevTools -> Application -> Local Storage: **Trống hoàn toàn** (không có access token).
4. Mở `/dashboard` và `/users`: Hoạt động mượt mà; Backend xác thực token cục bộ và không phát sinh cuộc gọi thừa sang Manage Server.
5. Nhấp "Đăng xuất": Cookie `access_token` bị xóa; cố tình truy cập lại `/dashboard` bị Route Guard chuyển hướng về `/login`.

---

## 18. Security Warnings / Credentials To Rotate

* **`PostgreSQL dev password`**: Do tệp tin `docs/checkpoints/auth-user-cp0-environment.md` trước đây từng ghi nhận chuỗi kết nối của môi trường dev `data_platform_dev`, khuyến nghị đội ngũ DevOps thực hiện xoay vòng mật khẩu (password rotation) cho tài khoản PostgreSQL dev này.

---

## 19. Files Changed

* `core/config/app.py`: Bổ sung cấu hình cookie và manage token, chuyển default URLs sang placeholder.
* `core/config/s3.py`: Chuyển default endpoint sang localhost.
* `core/security/jwt.py`: Cập nhật thành hệ thống JWT chính thức của Data Platform (thêm `iss`, `iat`, claims đầy đủ).
* `core/telemetry/telemetry.py`: Tích hợp đọc endpoint qua `AppSettings`.
* `modules/identity/use_cases/login.py`: Cập nhật phát hành Platform JWT riêng, hủy Manage token ngay sau khi lấy identity.
* `modules/identity/client/manage_client.py`: Hỗ trợ `manage_api_token` độc lập.
* `modules/identity/di.py`: Inject `manage_api_token` vào `ManageClient`.
* `apps/api/deps/auth.py`: `CurrentUser` xác thực Platform JWT cục bộ, hỗ trợ Cookie và Bearer header.
* `apps/api/routers/identity.py`: `login` gán HttpOnly Cookie, `logout` xóa HttpOnly Cookie.
* `apps/api/routers/users.py`: Đảm bảo ranh giới an toàn, không truyền Platform JWT sang Manage Server.
* `web/src/features/auth/hooks/use-auth-queries.ts`: Xóa bỏ các thao tác `setAuthToken` / `clearAuthToken`.
* `web/src/lib/api.ts`: Cấu hình `withCredentials: true`, bỏ request interceptor gán token từ `localStorage`.
* `web/src/lib/auth-token.ts`: **ĐÃ XÓA** (loại bỏ hoàn toàn dead code).
* `.env.example` & `web/.env.example`: Làm sạch và bổ sung đầy đủ biến an toàn.
* `docs/checkpoints/auth-user-cp0-environment.md`: Redact IP và mật khẩu database.
* `docs/checkpoints/auth-token-architecture-refactor.md`: **MỚI TẠO** (Báo cáo kiến trúc chi tiết).
* `tests/*`: Cập nhật toàn bộ bộ test phù hợp kiến trúc Platform JWT và HttpOnly Cookie.

---

## 20. Final Result

**PASS** (100% Đáp ứng tất cả các tiêu chí kiểm toán và yêu cầu kiến trúc mới).
