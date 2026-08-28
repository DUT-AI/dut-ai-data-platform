# BÁO CÁO BÀN GIAO: AUTHENTICATION & READ-ONLY USER MANAGEMENT

Tài liệu bàn giao tổng hợp dành cho Mentor và Đội ngũ phát triển dự án **DUT AI Data Platform**.

---

## 1. Yêu cầu nghiệp vụ được giao

1. **Authentication**: Tích hợp với External Auth Server (DUT Central Auth), xác thực người dùng an toàn và quản lý phiên làm việc.
2. **User Management chỉ READ**: Xem danh sách người dùng, tuyệt đối **không** xây dựng CRUD (không Create, Update, Delete, Reset Password).
3. **Dữ liệu người dùng qua Manage API**: Lấy danh sách người dùng trực tiếp từ hệ thống Manage Service.
4. **Lưu Last Login**: Ghi nhận thời điểm gần nhất người dùng đăng nhập thành công vào Data Platform và hiển thị trên giao diện quản lý.

---

## 2. Trạng thái hoàn thành (Final Status)

* **Authentication + Read-only User Management theo scope mentor**: **DONE**
* **Refresh Token**: *Not supported by current External Auth Provider / Out of scope* (External Auth Server là JWT stateless không cung cấp endpoint refresh; khi token hết hạn, người dùng đăng nhập lại an toàn).

---

## 3. Luồng Authentication

### 3.1. Luồng xử lý (Flow)
```text
Frontend Login (/login)
  → Data Platform Backend
  → External Auth Server
  → Trả access_token & ghi nhận last_login_at
  → Lưu Bearer Token tại Frontend ('dut_ai_token')
  → Gắn header Authorization: Bearer <token>
  → CurrentUser Dependency xác thực qua AuthClient.get_me (chính xác 1 remote call)
  → Truy cập các Protected APIs (/dashboard, /users, /projects)
```

### 3.2. Danh sách Endpoints
* `POST /api/v1/auth/login`: Xác thực thông tin đăng nhập và cấp Bearer token.
* `GET  /api/v1/auth/me`: Trả về thông tin danh tính của user đang đăng nhập (Single remote call).
* `POST /api/v1/auth/logout`: Xử lý hủy phiên đăng nhập ở client-side và trả về 200 OK chuẩn xác.

---

## 4. User Management (Read-Only)

* **Nguyên tắc cốt lõi**: **CHỈ ĐỌC (READ ONLY)**. Data Platform không sở hữu bảng `users` và không thực hiện bất kỳ thao tác thay đổi dữ liệu người dùng nào.
* **Endpoint API**:
  * `GET /api/v1/users`: Endpoint duy nhất hỗ trợ đọc danh sách người dùng kèm phân trang và tìm kiếm.
* **Tuyệt đối không có**:
  * `POST /users` (Không tạo user)
  * `PUT /users/{id}` (Không sửa user)
  * `PATCH /users/{id}` (Không cập nhật từng phần)
  * `DELETE /users/{id}` (Không xóa user)

---

## 5. Cơ chế Last Login Persistence

### 5.1. Khi đăng nhập (`POST /auth/login`)
* Khi External Auth trả về token thành công, Data Platform thực thi **UPSERT atomic** vào bảng `user_login_metadata`:
  ```sql
  INSERT INTO user_login_metadata (user_id, last_login_at)
  VALUES (:user_id, :now)
  ON CONFLICT (user_id) DO UPDATE SET last_login_at = EXCLUDED.last_login_at;
  ```
* Bảng lưu trữ tối giản: `user_id VARCHAR(255) PRIMARY KEY` và `last_login_at TIMESTAMPTZ NOT NULL`. Không lưu mật khẩu hay token.

### 5.2. Khi xem danh sách người dùng (`GET /api/v1/users`)
* Data Platform gọi Manage API lấy $N$ người dùng.
* Thực hiện **đúng 1 query batch duy nhất** vào DB:
  ```sql
  SELECT user_id, last_login_at FROM user_login_metadata WHERE user_id IN (...);
  ```
* Ghép nối dữ liệu in-memory ($O(1)$) để trả về frontend:
  * User đã từng login Data Platform: `last_login_at = ISO Timestamp` (hiển thị ngày giờ `vi-VN`).
  * User chưa từng login Data Platform: `last_login_at = null` (hiển thị nhãn **"Chưa đăng nhập"**).
* **Zero N+1 Query**: Hoàn toàn không có tình trạng lặp query theo từng dòng dữ liệu.

---

## 6. Giao diện Frontend (`/users`)

Trang Quản lý Người dùng tại đường dẫn `/users` bao gồm:
* **Các cột dữ liệu**: Người dùng (Avatar/Initials + Tên), Email, Vai trò (Badges), Trạng thái (Hoạt động/Không hoạt động), Lần đăng nhập cuối.
* **Tìm kiếm**: Ô Search có cơ chế debounce 350ms, tự động reset về trang 1 khi tìm kiếm.
* **Phân trang**: Điều hướng server-side (`page`, `page_size = 20`).
* **Trạng thái giao diện**:
  * **Loading**: 5 hàng Skeleton nhấp nháy giữ ổn định cấu trúc bảng, không giật layout.
  * **Error**: Khung thông báo lỗi thân thiện kèm nút **"Thử lại"** (`refetch`).
  * **Empty**: Thông báo `"Chưa có người dùng để hiển thị."`.
* **Tuyệt đối không có User CRUD**: Không có nút Thêm/Sửa/Xóa hay menu thao tác không cần thiết.

---

## 7. Các cải tiến kỹ thuật quan trọng (Technical Improvements)

1. **Loại bỏ Hardcode Service URLs**: Toàn bộ URL dịch vụ ngoài được cấu hình tập trung qua `AppSettings` (`AUTH_SERVER_URL`, `MANAGE_SERVER_URL`).
2. **Quản lý cấu hình qua `.env`**: `.env` được **git-ignore** hoàn toàn, `.env.example` chỉ chứa placeholder an toàn, không có secret leak.
3. **Áp dụng Dishka DI**: Đăng ký `AuthClient`, `ManageClient`, `UserLoginRepository`, `LoginUseCase`, `ListUsersUseCase` theo chuẩn Clean Architecture (`Scope.APP` và `Scope.REQUEST`).
4. **Khắc phục Duplicate Remote Call `/auth/me`**: Tối ưu router trả về `current_user` từ dependency `CurrentUser`, đảm bảo đúng 1 request tới External Auth Server.
5. **Loại bỏ Local JWT Ambiguity**: Xóa bỏ hoàn toàn code giải mã external token bằng secret key nội bộ. Xác lập External Auth Server là Source of Truth duy nhất.
6. **Centralized 401 Handling**: Bổ sung Axios response interceptor tự động xóa token và chuyển hướng về `/login` khi phiên làm việc hết hạn (kèm logic chống redirect loop).
7. **Client-side Route Guard**: Bổ sung `AuthGuard` tại `ProtectedLayout`, hiển thị màn hình loading trong khi kiểm tra phiên, chống hiện tượng flash nội dung chưa xác thực.
8. **Loại bỏ N+1 Query**: Áp dụng batch query cho `last_login_at`, đảm bảo hiệu năng tối ưu.

---

## 8. Kết quả kiểm thử & Build (Verification)

* **Backend Unit & Integration Tests**: **25/25 test cases PASS 100%** trong Pytest (`10.54s`).
* **Backend Linter & Formatting**: **Ruff PASS 100%** (168 files checked, 0 errors).
* **Database Migration**: **Alembic revision `008_create_user_login_metadata (head)`**.
* **Frontend TypeScript Check**: `tsc --noEmit` -> **0 errors (PASS)**.
* **Frontend Production Build**: `next build` Turbopack biên dịch thành công trong `39.7s` -> **PASS**.
* **E2E Flow**: Luồng Login -> Ghi nhận last login -> CurrentUser -> Users Page -> Logout -> Route Guard hoạt động mượt mà.

---

## 9. Hạn chế còn lại (Remaining Limitation)

* **Refresh Token**: External Auth Provider hiện tại chưa hỗ trợ endpoint cấp lại token (`/auth/refresh`). Khi access token hết hạn, người dùng được hệ thống tự động đưa về trang `/login` để đăng nhập lại an toàn. *(Hạn chế phụ thuộc vào nhà cung cấp Auth bên ngoài, không phải lỗi của Data Platform)*.

---

## 10. Các nhóm thư mục mã nguồn chính (Feature Areas)

* `modules/identity/`: Domain entities, interfaces, DTOs, clients (`AuthClient`, `ManageClient`), SQLAlchemy models, repository và use cases (`LoginUseCase`, `ListUsersUseCase`, `GetMeUseCase`).
* `apps/api/routers/`: Routers `identity.py` (`/login`, `/me`, `/logout`) và `users.py` (`GET /users`).
* `apps/api/deps/`: Dependency `CurrentUser` bảo vệ các route nội bộ.
* `migrations/`: Migration `008_create_user_login_metadata.py`.
* `web/src/features/users/`: Feature frontend người dùng (types, api, hooks, components `UserListTable`, `UsersView`).
* `web/src/features/auth/`: Hook và service xác thực frontend.
* `web/src/lib/`: `api.ts` (Axios interceptor) và `auth-token.ts` (quản lý key `dut_ai_token`).
* `tests/`: 5 bộ test tự động (`test_auth_client`, `test_manage_client`, `test_last_login`, `test_users_backend`, `test_auth_completion`).

---

## 11. Kịch bản Demo cho Mentor (Demo Checklist)

```text
[ ] Bước 1: Đăng nhập tại /login bằng tài khoản hợp lệ.
[ ] Bước 2: Dashboard hiển thị thông tin người dùng từ /api/v1/auth/me.
[ ] Bước 3: Nhấp vào mục "Người dùng" trên thanh Sidebar (/users).
[ ] Bước 4: Kiểm tra danh sách người dùng được fetch trực tiếp từ Manage API.
[ ] Bước 5: Kiểm tra cột "Lần đăng nhập cuối": user vừa đăng nhập có timestamp cụ thể, user khác hiển thị "Chưa đăng nhập".
[ ] Bước 6: Thử tìm kiếm tên/email (debounced) và chuyển trang phân trang.
[ ] Bước 7: Nhấp nút "Đăng xuất" trên Sidebar -> token bị xóa, chuyển về /login.
[ ] Bước 8: Cố tình gõ trực tiếp URL /users hoặc /dashboard -> AuthGuard chặn và chuyển hướng về /login.
```

---

## 12. Kết luận (Final Conclusion)

Nhiệm vụ **Authentication & Read-only User Management** đã được hoàn thành trọn vẹn và đáp ứng chính xác mọi yêu cầu của Mentor. Hệ thống quản lý người dùng hoạt động hoàn toàn ở chế độ Read-Only, tận dụng tối đa Manage Service API sẵn có và tuyệt đối không trùng lặp chức năng quản trị tài khoản. Nền tảng Data Platform chỉ sở hữu duy nhất metadata cục bộ `last_login_at` với hiệu năng cao (Zero N+1 Query). Toàn bộ mã nguồn backend và frontend đã vượt qua 100% các bài kiểm tra tự động, linter, typecheck và bản build thực tế.
