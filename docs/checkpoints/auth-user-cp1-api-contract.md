# Checkpoint 1 — Auth & Manage API Contract + Config Cleanup Report

## 1. Executive Summary

Checkpoint 1 đã hoàn thành việc xác minh hợp đồng API (API contract) của **External Auth Server** và **Manage Users Service**, đồng thời thực hiện tái cấu trúc toàn diện (refactoring) để loại bỏ hoàn toàn các cấu hình hardcode, magic URL/string và chuẩn hóa luồng Dependency Injection (Dishka) theo đúng Clean Architecture của dự án.

---

## 2. API Contract Verification

### 2.1. Central Auth API Contract

* **Base URL**: `https://manage.dutai.io.vn/api/v1` (Cấu hình qua `AUTH_SERVER_URL`)
* **Endpoints**:
  1. `POST /api/v1/auth/login`
     * **Request Body**: `{"email": "...", "password": "..."}`
     * **Success Response (200 OK)**:
       ```json
       {
         "is_success": true,
         "data": {
           "access_token": "<jwt_string>",
           "refresh_token": "<jwt_string>",
           "token_type": "bearer"
         }
       }
       ```
     * **Failure Response (400/401/422)**:
       ```json
       {
         "is_success": false,
         "status_code": 401,
         "message": "Email hoặc mật khẩu không chính xác.",
         "data": null
       }
       ```
  2. `GET /api/v1/auth/me`
     * **Headers**: `Authorization: Bearer <access_token>`
     * **Success Response (200 OK)**:
       ```json
       {
         "is_success": true,
         "data": {
           "id": 101,
           "name": "User Name",
           "email": "user@dutai.io.vn",
           "status": "ACTIVE",
           "avatar_url": null,
           "role_names": ["USER"]
         }
       }
       ```

---

### 2.2. Manage Service Users API Contract (Read-Only)

* **Base URL**: `https://manage.dutai.io.vn/api/v1` (Cấu hình qua `MANAGE_SERVER_URL`)
* **Endpoint**: `GET /api/v1/users`
* **Authentication**: `Authorization: Bearer <access_token>`
* **Query Parameters**:
  * `page: int` (Default: `1`)
  * `page_size: int` (Default: `20`)
  * `search: str` (Optional, tìm kiếm theo tên hoặc email)
* **Response Handling in Client**:
  * `ManageClient` được thiết kế linh hoạt hỗ trợ 2 dạng envelope từ server:
    * Dạng mảng trực tiếp: `{"is_success": true, "data": [{...}, ...]}`
    * Dạng phân trang chuẩn: `{"is_success": true, "data": {"items": [{...}], "total": 100, "page": 1, "page_size": 20}}`
  * Mapping chuẩn hóa sang `ManageUserDTO(id, name, email, status, avatar_url, role_names, raw_data)`.

---

## 3. Hardcode & Config Cleanup

Bảng thống kê toàn bộ các vị trí hardcode, magic string và cấu hình mơ hồ đã được loại bỏ:

| Issue | Before | After | File |
| ----- | ------ | ----- | ---- |
| **Dead domain default** | `auth_server_url = "https://manage.dutai.site/api/v1"` (Domain DNS chết) | `auth_server_url = "https://manage.dutai.io.vn/api/v1"` | `core/config/app.py` |
| **Thiếu setting Manage Server** | Không có biến riêng cho Manage Service | Bổ sung `manage_server_url: str = "https://manage.dutai.io.vn/api/v1"` | `core/config/app.py` |
| **Magic Timeout number** | `timeout = 10.0` hardcode trong client constructor | `external_api_timeout: float = 10.0` trong `AppSettings` | `core/config/app.py` |
| **Hardcode Credentials Default** | `minio_access_key = "dutai"`, `minio_secret_key = "dutai123"` trong code | `minio_access_key = ""`, `minio_secret_key = ""` (Bắt buộc đọc từ `.env`) | `core/config/s3.py` |
| **Boilerplate Token Key (Frontend)** | `AUTH_TOKEN_KEY = "project_boilerplate_token"` | `AUTH_TOKEN_KEY = "dut_ai_token"` | `web/src/lib/auth-token.ts` |
| **Manual Client Instantiation** | `client = AuthClient(...)` khởi tạo thủ công mỗi request trong dependency | Hỗ trợ Dishka DI injection (`client: FromDishka[AuthClient]`) kèm fallback | `apps/api/deps/auth.py` |
| **Thiếu Timeout Exception Handling** | Chỉ bắt `httpx.ConnectError` và `httpx.HTTPStatusError` | Bắt thêm `httpx.TimeoutException` -> trả `504 Gateway Timeout` | `modules/identity/client/auth_client.py`, `manage_client.py` |

---

## 4. Configuration Source of Truth

Toàn bộ cấu hình hệ thống hiện được quản lý tập trung và duy nhất qua **`AppSettings`** (`core/config/app.py`):

```python
class AppSettings(BaseSettings):
    # Auth & Manage Server Configuration
    auth_server_url: str = "https://manage.dutai.io.vn/api/v1"
    manage_server_url: str = "https://manage.dutai.io.vn/api/v1"
    external_api_timeout: float = 10.0
```

* **`AUTH_SERVER_URL`**: Quản lý endpoint kết nối Auth Server (`/auth/login`, `/auth/me`).
* **`MANAGE_SERVER_URL`**: Quản lý endpoint kết nối Manage Server (`/users`).
* **`EXTERNAL_API_TIMEOUT`**: Quản lý thời gian timeout tối đa cho các external HTTP requests.

---

## 5. External Client Architecture & DI

### 5.1. ManageClient (`modules/identity/client/manage_client.py`)
* Tuân thủ triệt để nguyên tắc **Read-Only**: chỉ cung cấp phương thức `list_users()`.
* Hoàn toàn **KHÔNG CÓ** các phương thức create, update, delete, reset password.
* Tự động chuẩn hóa URL, ngăn ngừa lỗi duplicate `/api/v1`.

### 5.2. Dishka DI Provider (`modules/identity/di.py`)
* Đã đăng ký `AuthClient` và `ManageClient` ở `Scope.APP` (singleton vòng đời ứng dụng), sử dụng các tham số từ `AppSettings`.

---

## 6. Tests Executed

Đã viết và chạy 10 unit test cases cho `AuthClient` và `ManageClient`:
* `tests/test_auth_client.py`:
  * `test_auth_client_build_url` (Kiểm tra chuẩn hóa URL)
  * `test_auth_client_login_success` (Kiểm tra parse TokenResponse)
  * `test_auth_client_login_invalid_credentials` (Kiểm tra bắt lỗi 401)
  * `test_auth_client_get_me_success` (Kiểm tra parse AuthUser)
  * `test_auth_client_get_me_expired_token` (Kiểm tra token hết hạn)
* `tests/test_manage_client.py`:
  * `test_manage_client_build_url` (Kiểm tra chuẩn hóa URL)
  * `test_manage_client_list_users_paginated` (Kiểm tra parse response có phân trang)
  * `test_manage_client_list_users_list_envelope` (Kiểm tra parse response dạng list trực tiếp)
  * `test_manage_client_unauthorized` (Kiểm tra bắt lỗi 401)
  * `test_manage_client_timeout` (Kiểm tra bắt lỗi timeout 504)

**Kết quả kiểm thử**:
* `pytest`: **10 passed in 12.50s** (100% PASS).
* `ruff check .`: **All checks passed!** (Clean code, không có lint error).

---

## 7. Remaining Ambiguities & Blockers

* **Tài khoản test thực tế**: Cần 1 tài khoản (email/password) thực tế trên hệ thống `manage.dutai.io.vn` để thực hiện integration test end-to-end với backend live nếu cần kiểm tra trực tiếp.

---

## 8. Result

**PASS** (Toàn bộ hợp đồng API đã được chuẩn hóa, toàn bộ hardcode trong phạm vi Auth/Identity/Config đã được dọn sạch, ManageClient đã sẵn sàng cho tầng UseCase tiếp theo).
