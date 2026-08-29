# Checkpoint 3 — Read-Only Users Backend Report

## 1. Requirement

Mentor yêu cầu:
> Quản lý user thì chỉ READ, thông qua API Manage.
> Data Platform không sở hữu CRUD user riêng, không lưu bản sao toàn bộ user vào DB local.
> Chỉ bổ sung metadata local `last_login_at` và trả về danh sách user hoàn chỉnh cho Frontend.

---

## 2. Manage Contract Used

* **Base URL**: `https://manage.dutai.io.vn/api/v1` (từ `MANAGE_SERVER_URL`)
* **Endpoint**: `GET /api/v1/users`
* **Authentication**: Forward Bearer token của user hiện tại (`Authorization: Bearer <token>`).
* **Query Parameters**:
  * `page: int` (Default: `1`)
  * `page_size: int` (Default: `20`)
  * `search: str | None` (Tìm kiếm theo tên / email)
* **Response Handling**: `ManageClient` parse envelope (`is_success`, `data`) sang `ManageUsersResponseDTO(items=[ManageUserDTO], total, page, page_size)`.

---

## 3. Authentication & Security

* Endpoint `GET /api/v1/users` được bảo vệ bởi dependency `CurrentUser` và `bearer_scheme`.
* Request không có token hoặc token không hợp lệ -> Trả về `HTTP 401 Unauthorized`.
* **Zero Secret Leak**: Token được forward an toàn từ header tới `ManageClient`, không lưu vào DB, không log token/password/credentials.

---

## 4. Endpoint Implementation

* **Route**: `GET /api/v1/users`
* **File**: `apps/api/routers/users.py`
* **Method**: Chỉ duy nhất `GET` (Read-only).
* **Write Operations**: Tuyệt đối **KHÔNG CÓ** `POST /users`, `PUT /users/{id}`, `PATCH /users/{id}`, `DELETE /users/{id}` hay các hàm create/update/delete/reset password.

---

## 5. Internal DTO (`modules/identity/dtos/user_dtos.py`)

### `UserReadDTO`
```python
class UserReadDTO(BaseModel):
    id: int | str
    name: str
    email: str
    status: str = "ACTIVE"
    avatar_url: str | None = None
    role_names: list[str] = Field(default_factory=list)
    last_login_at: datetime | None = None
```

### `UsersListResponseDTO`
```python
class UsersListResponseDTO(BaseModel):
    items: list[UserReadDTO] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20
```

---

## 6. Data Merge Flow & N+1 Prevention

### Flow trong `ListUsersUseCase` (`modules/identity/use_cases/list_users.py`):
1. Gọi `ManageClient.list_users(token, page, page_size, search)` để lấy danh sách $N$ người dùng từ Manage Service.
2. Nếu danh sách rỗng (`items == []`): Trả về ngay `UsersListResponseDTO(items=[])` mà **không thực hiện query DB**.
3. Nếu danh sách có $N$ người dùng:
   * Trích xuất toàn bộ user IDs: `user_ids = [str(u.id) for u in manage_resp.items]`.
   * Thực thi **đúng 1 query batch duy nhất**: `last_login_map = await self.login_repo.get_by_user_ids(user_ids)`.
   * SQL tương đương: `SELECT user_id, last_login_at FROM user_login_metadata WHERE user_id IN (...)`.
   * Merge $O(1)$ in-memory: gán `last_login_at = last_login_map.get(str(u.id))`.
4. Nếu user chưa từng đăng nhập Data Platform, `last_login_at` có giá trị `None` (`null` trong JSON).

---

## 7. Pagination / Search Strategy

* `GET /api/v1/users?page=1&page_size=20&search=alice`
* Router nhận `page`, `page_size`, `search` và ủy quyền cho `ListUsersUseCase` chuyển tiếp trực tiếp sang `ManageClient`.
* Không fetch toàn bộ dữ liệu rồi paginate local.

---

## 8. Error Handling

* Khi Manage Service gặp sự cố (Timeout, ConnectError, 502/503): `ManageClient` và `ListUsersUseCase` truyền đúng mã lỗi HTTP lên Presentation Layer.
* **Không fallback giả tạo**: Tuyệt đối không trả về user ảo hay dữ liệu cũ từ local DB vì local DB không phải Source of Truth cho danh sách user.

---

## 9. Security & Exposed Fields

* Chỉ expose các trường cần thiết cho Data Platform UI: `id`, `name`, `email`, `status`, `avatar_url`, `role_names`, `last_login_at`.
* Không pass-through `raw_data`, internal permissions, phone hay các trường nhạy cảm khác từ hệ thống ngoài.

---

## 10. Tests Executed & Results

Đã thực thi toàn bộ **21 unit & API test cases**:
* `tests/test_users_backend.py`:
  * `test_list_users_use_case_merge_last_login` (Merge external users và local last login) — **PASSED**
  * `test_list_users_use_case_empty_users` (Xử lý danh sách rỗng không query DB) — **PASSED**
  * `test_list_users_use_case_manage_failure` (Manage lỗi truyền mã lỗi chuẩn, không trả fake data) — **PASSED**
  * `test_list_users_use_case_pagination_and_search_forwarding` (Chuyển tiếp pagination & search) — **PASSED**
  * `test_api_get_users_unauthenticated` (Unauthenticated trả 401) — **PASSED**
  * `test_api_get_users_authenticated_success` (Authenticated trả 200 kèm DTO hợp lệ) — **PASSED**
* `tests/test_last_login.py`: 5 test cases — **PASSED**
* `tests/test_auth_client.py`: 5 test cases — **PASSED**
* `tests/test_manage_client.py`: 5 test cases — **PASSED**

**Kết quả**:
* **Pytest**: `21 passed in 21.34s` (100% PASS).
* **Ruff**: `All checks passed!`

---

## 11. Files Changed / Created

* [modules/identity/dtos/user_dtos.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/dtos/user_dtos.py) **[NEW]** — `UserReadDTO` & `UsersListResponseDTO`.
* [modules/identity/dtos/__init__.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/dtos/__init__.py) — Export internal DTOs.
* [modules/identity/use_cases/list_users.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/use_cases/list_users.py) **[NEW]** — `ListUsersUseCase`.
* [modules/identity/use_cases/__init__.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/use_cases/__init__.py) — Export `ListUsersUseCase`.
* [modules/identity/di.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/di.py) — Đăng ký `ListUsersUseCase` vào Dishka container.
* [apps/api/routers/users.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/apps/api/routers/users.py) **[NEW]** — Router `GET /api/v1/users`.
* [apps/api/routers/__init__.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/apps/api/routers/__init__.py) — Export `users_router`.
* [apps/api/main.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/apps/api/main.py) — Mount `users_router`.
* [tests/test_users_backend.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/tests/test_users_backend.py) **[NEW]** — Unit & API integration tests cho User Management backend.

---

## 12. Remaining Risks
* Không có rủi ro backend. Toàn bộ backend flow (Client -> Use Case -> Router -> DI -> Repository -> Batch Merge) đã hoàn tất và sẵn sàng kết nối với Frontend ở Checkpoint 4.

---

## 13. Result

**PASS**
