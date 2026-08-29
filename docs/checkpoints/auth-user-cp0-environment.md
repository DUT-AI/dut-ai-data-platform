# Checkpoint 0 — Environment Setup & Baseline Verification Report

## 1. Environment Configured

* **`.env` (Backend Root)**: Đã tạo và cấu hình đầy đủ kết nối tới PostgreSQL, MinIO, Label Studio, External Auth & Manage Server.
  * `DATABASE_URL`: `<redacted_db_url>`
  * `MINIO_ENDPOINT`: `https://dataplatforms3.dutai.io.vn/`
  * `AUTH_SERVER_URL`: `https://manage.dutai.io.vn/api/v1`
  * `MANAGE_SERVER_URL`: `https://manage.dutai.io.vn/api/v1`
* **`web/.env.local` (Frontend)**: Đã tạo với cấu hình `NEXT_PUBLIC_API_BASE_URL="http://localhost:8000/api/v1"`.
* **Git Security Check**: Đã kiểm tra qua `git check-ignore .env` và `git status --short`. File `.env` và `.env.local` được `.gitignore` bảo vệ tuyệt đối, không bị theo dõi và không commit secrets.
* **Configuration Loading (`core/config/app.py`)**: Đã bổ sung thuộc tính `manage_server_url: str = "https://manage.dutai.io.vn/api/v1"` vào `AppSettings`.

---

## 2. Backend Baseline

* **Python & Tooling**: Python 3.12.7, `uv` package manager. Đã đồng bộ 122 package dependencies vào `.venv`.
* **Health & Readiness Check**:
  * `GET /health` -> `HTTP 200 OK` (`{"status": "ok", "version": "0.1.0"}`).
  * `GET /ready` -> `HTTP 503` (`database: ok`, `minio: ok`, `redis: error: Timeout connecting to server`). PostgreSQL và MinIO hoạt động bình thường, Redis chưa bật ở local (không ảnh hưởng tới auth/users).
* **Alembic Migrations**: Đã xác minh qua `uv run alembic current` -> Đang ở revision `5424e25876cf (head)`.
* **OpenAPI Registered Auth Routes**:
  * `POST /api/v1/auth/login`
  * `GET /api/v1/auth/me`

---

## 3. Frontend Baseline

* **Tooling & Dependencies**: Node.js, `pnpm v11.24.0`. Đã cài đặt thành công 378 packages vào `web/node_modules`.
* **Next.js Production Build (`pnpm build`)**:
  * Build thành công với Turbopack trong 34.5s.
  * TypeScript typecheck pass 100% trong 18.6s.
  * Các routes tĩnh/động hoạt động:
    * `/` (Redirect)
    * `/login` (Trang đăng nhập)
    * `/dashboard` (Trang tổng quan cá nhân)
    * `/projects`, `/projects/[id]`, `/projects/[id]/annotate/[assetId]`

---

## 4. Database Connectivity
 
* **Target Database**: `<redacted_db_host>/data_platform_dev`
* **Test Method**: Khởi tạo `AsyncEngine` (asyncpg) và thực thi truy vấn `SELECT 1`.
* **Result**: **SUCCESS** (`scalar() == 1`).

---

## 5. External Auth Connectivity

* **Target Domain cũ**: `https://manage.dutai.site/api/v1`
  * **Trạng thái**: **DEAD / UNREACHABLE** (`[Errno 11001] getaddrinfo failed` - Tên miền không tồn tại trên DNS).
* **Target Domain mới (Mentor cung cấp)**: `https://manage.dutai.io.vn/api/v1`
  * **`POST /api/v1/auth/login`**: **REACHABLE** (`HTTP 422 Unprocessable Entity` khi gửi body rỗng, tuân thủ schema FastAPI).
  * **`GET /api/v1/auth/me`**: **REACHABLE** (`HTTP 401 Unauthorized`, response JSON chuẩn `['is_success', 'status_code', 'message', 'data']`).

---

## 6. Manage API Connectivity

* **Target Endpoint**: `GET https://manage.dutai.io.vn/api/v1/users`
* **HTTP Status**: **`HTTP 401 Unauthorized`**
* **Reachability**: **REACHABLE / LIVE**
* **Response Structure**:
  ```json
  {
    "is_success": false,
    "status_code": 401,
    "message": "...",
    "data": null
  }
  ```
* **Kết luận**: Endpoint `GET /api/v1/users` thực sự tồn tại trên máy chủ Manage (`manage.dutai.io.vn`) và yêu cầu xác thực Bearer token hợp lệ để truy xuất danh sách người dùng.

---

## 7. Confirmed URLs

| Dịch vụ | URL đã xác minh | Trạng thái |
| ------- | --------------- | ---------- |
| **Manage Service Users API** | `https://manage.dutai.io.vn/api/v1/users` | LIVE (HTTP 401 - Cần Bearer Token) |
| **Central Auth Login** | `https://manage.dutai.io.vn/api/v1/auth/login` | LIVE (HTTP 422 khi body rỗng) |
| **Central Auth Get Me** | `https://manage.dutai.io.vn/api/v1/auth/me` | LIVE (HTTP 401 - Cần Bearer Token) |
| **MinIO S3 Storage** | `https://dataplatforms3.dutai.io.vn/` | LIVE (List buckets OK) |
| **PostgreSQL Database** | `<redacted_db_host>/data_platform_dev` | LIVE (Async connection OK) |
| **Domain cũ (.site)** | `https://manage.dutai.site/api/v1` | OBSOLETE / DEAD |

---

## 8. Remaining Blockers

1. **Tài khoản người dùng thật để kiểm tra dữ liệu trả về của `GET /api/v1/users`**:
   * Cần 1 tài khoản (email/password) hợp lệ trên `manage.dutai.io.vn` để thực hiện login thật, lấy access token và inspect response schema chi tiết của danh sách users (`data.items`, pagination fields, v.v.).

---

## 9. Files Changed

1. `core/config/app.py` — Bổ sung `manage_server_url` vào `AppSettings`.
2. `.env.example` — Cập nhật placeholder `AUTH_SERVER_URL` và `MANAGE_SERVER_URL` trỏ về domain `.io.vn`.
3. `.env` — Tạo file local configuration (được `.gitignore` bảo vệ).
4. `web/.env.local` — Tạo file configuration cho Next.js frontend.
5. `docs/checkpoints/auth-user-cp0-environment.md` — Báo cáo kết quả Checkpoint 0.

---

## 10. Commands Executed

* `git check-ignore .env` (Xác nhận ignore)
* `git status --short` (Kiểm tra git tree)
* `uv run python ...` (Đồng bộ venv và test DB connection)
* `uv run alembic current` (Kiểm tra migration head)
* `npx -y pnpm install` (Cài đặt frontend dependencies)
* `npx -y pnpm build` (Build kiểm tra frontend TypeScript & Turbopack)
* Python HTTP probes tới `https://manage.dutai.io.vn` và `https://manage.dutai.site`

---

## 11. Result

**PASS** (Môi trường phát triển đã sẵn sàng, các endpoint bên ngoài đã được định vị chính xác, database và frontend build baseline hoàn toàn ổn định).
