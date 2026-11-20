# Research: Data Platform làm Resource Server của DUT AI SSO

## R1. Hệ sinh thái Workspace

Nguồn: repo `DUT-AI-workspace` (`cloudflare/worker.js`, `specs/001-unified-app-portal/*`).

- Worker gắn với `workspace.dutai.io.vn/*`. Bảng `ROUTES` hiện có:

  | Prefix | Upstream |
  |---|---|
  | `/manage` | `https://manage.dutai.io.vn` |
  | `/lms` | `https://lms.dutai.io.vn` |
  | `/meetly` | `https://meetly.dutai.io.vn` |

- Khi proxy, Worker giữ nguyên `pathname` và set `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto`, `X-Forwarded-Prefix`. Response upstream được trả thẳng về browser, nên `Set-Cookie` cũng đi qua nguyên vẹn.
- Một số đường dẫn được Worker xử lý riêng:
  - `/login` và `/logout` redirect sang `/manage/login` và `/manage/logout`.
  - `/` render Portal, đọc cookie `access_token` (không verify) để chào tên người dùng.
- Quy ước cho app con:
  - phải đặt `basePath` theo prefix;
  - không tự tạo token;
  - verify JWT trong RAM bằng secret chung (`SHARED_JWT_SECRET`, chính là `SECRET_KEY` của Manage).

## R2. Token thật do Manage phát

Nguồn: `dut-ai-manager/backend/app/utils/password.py`, `auth/controller.py`.

- HS256 với `SECRET_KEY`.
- Claims: `exp`, `type`, `sub` (chuỗi số), `user_id`, `name`, `email`, `roles`, `avatar`, `permissions`. **Không có `iat`, `iss`.**
- Access token sống `ACCESS_TOKEN_EXPIRE_MINUTES` (mặc định 8 ngày). Refresh token sống 7 ngày, cùng bộ claims, chỉ khác `type="refresh"`.
- Cookie: `HttpOnly; SameSite=lax; Path=/; Domain=COOKIE_DOMAIN`, có `Secure` khi production.
- Spec của Workspace ghi `role_names` + `iat`, lệch với token thật. Data Platform đọc `roles` và không yêu cầu `iat`.
- Refresh token có đủ claims như access token. Vì vậy phải kiểm tra `type == "access"`, nếu không refresh token (7 ngày) sẽ dùng thay access token được.

## R3. Hạ tầng server `dutai-minipc`

Đã kiểm tra trực tiếp trên server, chỉ đọc.

**Tunnel ingress** (lấy từ `cloudflared` metrics `/config`):

| Hostname | Service |
|---|---|
| `manage` | :1234 |
| `workspace` | :3003 |
| `dataplatforms3` | MinIO :9000 |
| `s3minipc`, `clb`, `hpnguyengraduation` | các app khác |

Chưa có hostname cho Data Platform. Hostname sẽ dùng là `dataplatform.dutai.io.vn` → `http://localhost:3036` (web, `WEB_HOST_PORT=3036`). Không nhầm với `dataplatforms3.dutai.io.vn`, hostname của MinIO.

**Cổng:**
- Đang dùng: 22, 1234, 2375, 3002, 3003, 3456, 4567, 5432, 5435, 5444, 6060, 6379, 6381, 6391, **8000 (Manage API)**, 9000/9001, 10000/10001, 20241.
- Còn trống: 3000, 3001, **3036**, 8010, 8080, 5672, 15672.

**MinIO của Data Platform dùng chung với Meetly.** Ngoài bucket `ai-data-platform` còn có `meetly-dev` và `meetly-prod`.

**Repo trên server:**
- Đang ở nhánh `main`, cũ 4 tháng.
- `api` và `web` chưa từng chạy.
- `.env` chỉ có biến hạ tầng.
- `web/.env` đang trỏ `localhost:8000`.

## R4. Các phương án cân nhắc

| Phương án | Kết luận | Lý do |
|---|---|---|
| **A. Resource Server, `basePath=/data`, API same-origin qua Next rewrite** | **Chọn** | Đúng quy ước Workspace. Một hostname tunnel. Không cần CORS. API không phải publish ra host |
| B. Giữ form login + tự ký JWT | Loại | Hai phiên tách biệt, logout lệch nhau, trái quy ước Workspace |
| C. Proxy refresh qua Manage | Loại | TTL mặc định (access 8 ngày > refresh 7 ngày) làm đường refresh không bao giờ thành công |
| D. Tunnel route theo path (`/data/api` → API) | Loại | FastAPI phải bỏ prefix (`root_path` + rewrite), tunnel cần 2 rule |
| E. Subdomain riêng cho API | Loại | Cần CORS và thêm hostname, trong khi Worker chỉ route theo path |
| F. Gọi Manage `/auth/me` mỗi request | Loại | Kiến trúc cũ đã bỏ vì latency |

## R5. Ghi nhận kỹ thuật

- **httpx lưu cookie.** `httpx.AsyncClient` mặc định lưu `Set-Cookie`. Client dùng chung (scope APP) phục vụ cả login lẫn `ManageClient.list_users`. Manage đọc cookie trước Bearer (`core/deps.py`), nên lời gọi service sẽ chạy dưới phiên người vừa đăng nhập. Cách xử lý: dùng `CookieJar(policy=DefaultCookiePolicy(allowed_domains=[]))`, đã chạy thử và client lưu 0 cookie.
- **Giới hạn body của Next 16.** Khi đi qua rewrite, Next clone request body và cắt bỏ phần vượt `experimental.proxyClientMaxBodySize` (mặc định 10MB). Upload dataset trên UI đi presigned thẳng tới MinIO nên không qua rewrite. Endpoint multipart `/dataset-versions/{id}/assets` chưa có UI gọi. Vẫn đặt giới hạn `100mb` để endpoint này không âm thầm hỏng.
- **basePath không tự thêm prefix cho mọi đường dẫn.** `basePath` chỉ áp dụng cho `Link` và `router`. Hai chỗ phải tự thêm prefix:
  - `window.location`;
  - ảnh template `/static/templates/*.png`, đến từ `modules/project/data/templates.json`.
- **Presigned URL.** URL được ký theo `MINIO_ENDPOINT` (`core/storage/minio_adapter.py`). Trên server, biến này phải là host public `https://dataplatforms3.dutai.io.vn`.
- **Migration.** Image API chưa chứa `migrations/` và `alembic.ini`, cần thêm vào để chạy `alembic upgrade head` trong container.
- **`last_login_at`.** Dùng `INSERT ... ON CONFLICT DO UPDATE ... WHERE last_login_at < now - interval`. Chỉ một câu lệnh, không có race đọc-rồi-ghi, chạy được trên PostgreSQL và trên SQLite dùng cho test.

## R6. Biến môi trường lấy từ Manage

| Manage | Data Platform | Ghi chú |
|---|---|---|
| `SECRET_KEY` | `JWT_SECRET_KEY` | Cùng giá trị, bắt buộc |
| `COOKIE_DOMAIN=.dutai.io.vn` | `AUTH_COOKIE_DOMAIN` | Để trống khi chạy local |
| `ENVIRONMENT=production` (Secure) | `AUTH_COOKIE_SECURE=true` | |
| `POSTGRES_*`, `REDIS_*` | — | Không dùng |
