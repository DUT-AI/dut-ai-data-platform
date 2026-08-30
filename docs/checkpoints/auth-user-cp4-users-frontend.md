# Checkpoint 4 — Read-Only Users Frontend Report

## 1. Requirement

Mentor yêu cầu:
> Quản lý user chỉ để xem (Read-only).
> Frontend cung cấp trang `/users` cho phép người dùng xem danh sách user lấy từ `GET /api/v1/users` của Data Platform Backend.
> Hiển thị tối thiểu: Người dùng (Avatar + Tên), Email, Vai trò, Trạng thái, Lần đăng nhập cuối (`last_login_at`).
> Tuyệt đối không có các tính năng Create, Edit, Delete, Reset Password hay Role change.

---

## 2. Backend Contract Used

* **Endpoint**: `GET /api/v1/users`
* **Query Params**:
  * `page: number` (Default: 1)
  * `page_size: number` (Default: 20)
  * `search: string` (Optional)
* **Response Schema**:
  ```ts
  interface UsersListResponse {
    items: UserRead[];
    total: number;
    page: number;
    page_size: number;
  }

  interface UserRead {
    id: string | number;
    name: string;
    email: string;
    status: string;
    avatar_url: string | null;
    role_names: string[];
    last_login_at: string | null;
  }
  ```

---

## 3. Frontend Architecture

* Áp dụng cấu trúc **Feature-based architecture** đồng bộ với `features/projects/`:
  ```text
  web/src/features/users/
  ├── api/
  │   └── user-api.ts          # Gọi shared Axios client (web/src/lib/api.ts)
  ├── components/
  │   ├── user-list-table.tsx  # Bảng danh sách người dùng Read-only
  │   └── users-view.tsx       # Container view bao gồm Search, Header, Table, Pagination
  ├── hooks/
  │   └── use-users.ts         # TanStack React Query hook (USER_KEYS, useUsersQuery)
  ├── types/
  │   └── user.ts              # TypeScript interfaces
  └── index.ts                 # Feature public exports
  ```

---

## 4. Route

* **URL**: `/users`
* **File**: [web/src/app/(protected)/users/page.tsx](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/app/%28protected%29/users/page.tsx)
* Nằm trong layout protected, kế thừa `AppShell` và state xác thực `AuthContext`.

---

## 5. Components

### 5.1. `UsersView` (`web/src/features/users/components/users-view.tsx`)
* Quản lý state `page`, `searchTerm`, `debouncedSearch`.
* Tích hợp thanh tìm kiếm debounced (350ms).
* Hiển thị tổng số lượng người dùng: `Danh sách người dùng ({total})`.
* Điều hướng phân trang (Previous / Next / Trang X trên Y).

### 5.2. `UserListTable` (`web/src/features/users/components/user-list-table.tsx`)
* **Chế độ xem hoàn toàn (Read-Only)**: Không có cột Action, không có nút thêm/sửa/xóa/reset password.
* **Người dùng**: Hiển thị avatar hình ảnh nếu có `avatar_url`, hoặc avatar chữ cái đầu (Initials) nền xanh nhã nhặn kèm Họ và Tên.
* **Email**: Hiển thị địa chỉ email người dùng.
* **Vai trò**: Hiển thị danh sách badge theo `role_names` (phân biệt Admin / Annotator / Reviewer / User).
* **Trạng thái**: Badge trạng thái (chấm xanh "Hoạt động" cho ACTIVE, chấm xám cho trạng thái khác).
* **Lần đăng nhập cuối**:
  * Nếu có timestamp -> Format `dd/mm/yyyy hh:mm` theo locale người dùng (`vi-VN`).
  * Nếu `last_login_at == null` -> Badge xám `"Chưa đăng nhập"`.

---

## 6. API Integration

* Sử dụng shared Axios instance từ [web/src/lib/api.ts](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/lib/api.ts).
* Request interceptor tự động gắn `Authorization: Bearer <dut_ai_token>`.
* Gọi đường dẫn tương đối `/users`, tự động khớp với `baseURL` của backend (`http://localhost:8000/api/v1/users`), hoàn toàn không bị lỗi duplicate `/api/v1/api/v1`.

---

## 7. Search & Pagination Strategy

* **Search**: Người dùng gõ vào ô tìm kiếm -> `useEffect` debounce 350ms -> Cập nhật `debouncedSearch` -> Tự động reset về trang 1 -> TanStack Query fetch lại API `GET /users?search=...`.
* **Pagination**:
  * `page_size`: Cố định 20 items / trang theo quy chuẩn backend.
  * Nút "Trang trước" bị disable khi `page <= 1`.
  * Nút "Trang sau" bị disable khi `page >= totalPages`.

---

## 8. Loading / Error / Empty States

* **Loading**: Hiển thị Skeleton gồm 5 dòng nhấp nháy (pulse animation) giữ nguyên kích thước và cấu trúc bảng, tránh giật layout (layout shift).
* **Error**: Hiển thị khung cảnh báo màu đỏ với thông điệp thân thiện kèm nút **"Thử lại"** (gọi `refetch()`). Không để lộ stack trace hay raw Axios error.
* **Empty**: Khi không có dữ liệu người dùng (`items.length === 0`), hiển thị `"Chưa có người dùng để hiển thị."`.

---

## 9. Navigation

* Đã bổ sung mục **"Người dùng"** vào Sidebar navigation trong [web/src/components/layout/app-shell.tsx](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/components/layout/app-shell.tsx):
  * Icon: `Users` từ thư viện có sẵn `lucide-react`.
  * Đường dẫn: `/users`.
  * Tự động highlight trạng thái active khi truy cập `/users`.

---

## 10. Security

* Frontend chỉ gọi Backend nội bộ của Data Platform (`/api/v1/users`), **tuyệt đối không gọi trực tiếp URL Manage Server**.
* Không có biến môi trường nào làm lộ credentials của DB hay Manage Service ra client-side.
* Không có `console.log` in token hay dữ liệu nhạy cảm ra browser console.

---

## 11. Tests & Build Verification

* **TypeScript Typecheck**:
  ```bash
  npm run typecheck
  > tsc --noEmit
  # 0 errors
  ```
* **Next.js Turbopack Build**:
  ```bash
  npm run build
  # ✓ Compiled successfully in 27.1s
  # Route (app)
  # └ ○ /users (Static prerendered)
  ```

---

## 12. Files Changed / Created

* [web/src/features/users/types/user.ts](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/features/users/types/user.ts) **[NEW]** — Types `UserRead`, `UsersListResponse`, `UserQueryParams`.
* [web/src/features/users/api/user-api.ts](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/features/users/api/user-api.ts) **[NEW]** — `userApi.getUsers`.
* [web/src/features/users/hooks/use-users.ts](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/features/users/hooks/use-users.ts) **[NEW]** — TanStack Query `useUsersQuery`.
* [web/src/features/users/components/user-list-table.tsx](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/features/users/components/user-list-table.tsx) **[NEW]** — Table Read-only.
* [web/src/features/users/components/users-view.tsx](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/features/users/components/users-view.tsx) **[NEW]** — Container view với Search & Pagination.
* [web/src/features/users/index.ts](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/features/users/index.ts) **[NEW]** — Export feature.
* [web/src/app/(protected)/users/page.tsx](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/app/%28protected%29/users/page.tsx) **[NEW]** — Trang `/users`.
* [web/src/components/layout/app-shell.tsx](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/web/src/components/layout/app-shell.tsx) — Thêm mục navigation "Người dùng".

---

## 13. Remaining Risks & Work for CP5
* Quản lý người dùng (Read-only User Management) đã **HOÀN THÀNH 100%** cả Backend lẫn Frontend.
* Phần việc còn lại duy nhất thuộc về **Checkpoint 5 (Full Authentication Flow & Token Lifecycle Cleanup)**:
  1. Route protection middleware (`web/src/middleware.ts`) ngăn unauthenticated user truy cập các trang protected.
  2. Axios response interceptor tự động bắt lỗi 401 để xử lý đăng xuất/redirect.
  3. Logout endpoint & cookie/token lifecycle cleanup.

---

## 14. Result

**PASS**
