# 🧪 Tài khoản Test — DUT AI Data Platform

> **Môi trường**: Local dev với MSW mock data (`NEXT_PUBLIC_API_MOCKING=enabled`)
> **Web**: http://localhost:3000 (hoặc :3001 nếu cổng 3000 đã bị chiếm)

---

## 🔐 Tài khoản Test (Mock Auth)

> Tất cả tài khoản dùng chung mật khẩu: **`dutai123`**
> Đăng nhập tại: **http://localhost:3000/login**

| Email | Mật khẩu | User ID | Tên | Ghi chú |
|-------|----------|---------|-----|---------|
| `owner@dutai.dev` | `dutai123` | `101` | Nguyễn Văn An | Tài khoản **chính** — là Owner của proj-001, 002, 004, 006 |
| `admin@dutai.dev` | `dutai123` | `102` | Trần Thị Bình | Admin trong proj-001, Owner của proj-003 |
| `annotator@dutai.dev` | `dutai123` | `103` | Lê Văn Cường | Annotator trong proj-001, Owner của proj-005 |
| `reviewer@dutai.dev` | `dutai123` | `104` | Phạm Thị Dung | Reviewer trong proj-001 |

---

## 👥 Danh sách User ID trong Mock Data

Mock data sử dụng **User ID số** để định danh thành viên (lấy từ API manage server).

| User ID | Vai trò mặc định (ví dụ) | Ghi chú |
|---------|--------------------------|---------|
| `101` | Owner của nhiều project | Tài khoản chính để test |
| `102` | Owner của proj-003, Admin trong proj-001 | Test quyền Admin |
| `103` | Owner của proj-005, Annotator trong proj-001 | Test quyền Annotator |
| `104` | Reviewer trong proj-001 | Test quyền Reviewer |
| `105` | Annotator trong proj-002 | Thành viên phụ |
| `106` | Reviewer trong proj-003 | Thành viên phụ |
| `107` | Annotator trong proj-006 | Thành viên phụ |
| `108` | Reviewer trong proj-006 | Thành viên phụ |

---

## 📁 Dự án Mock (Projects)

| Project ID | Tên dự án | Loại | Trạng thái | Owner |
|------------|-----------|------|------------|-------|
| `proj-001` | Nhận diện biển số xe | `detection` | ✅ active | `#101` |
| `proj-002` | OCR hóa đơn tài chính | `ocr` | ✅ active | `#101` |
| `proj-003` | Phân loại cảm xúc review sản phẩm | `nlp` | ✅ active | `#102` |
| `proj-004` | Phân loại ảnh y tế (X-quang) | `classification` | 🗄️ archived | `#101` |
| `proj-005` | Phân vùng tế bào ung thư | `segmentation` | ✅ active | `#103` |
| `proj-006` | Mô tả cảnh quan du lịch | `captioning` | ✅ active | `#101` |

---

## 🏷️ Thành viên trong từng Project

### proj-001 — Nhận diện biển số xe ⭐ (đầy đủ 4 roles để test)

| User ID | Role | Ghi chú |
|---------|------|---------|
| `#101` | 🟣 **OWNER** | Không thể xóa, không thể đổi role |
| `#102` | 🟢 **ADMIN** | Có thể mời, đổi role, xóa thành viên |
| `#103` | 🔵 **ANNOTATOR** | Chỉ xem, không thể quản lý thành viên |
| `#104` | 🟡 **REVIEWER** | Chỉ xem, không thể quản lý thành viên |

### proj-002 — OCR hóa đơn tài chính

| User ID | Role |
|---------|------|
| `#101` | 🟣 **OWNER** |
| `#105` | 🔵 **ANNOTATOR** |

### proj-003 — Phân loại cảm xúc

| User ID | Role |
|---------|------|
| `#102` | 🟣 **OWNER** |
| `#106` | 🟡 **REVIEWER** |

### proj-005 — Phân vùng tế bào ung thư

| User ID | Role |
|---------|------|
| `#103` | 🟣 **OWNER** |

### proj-006 — Mô tả cảnh quan du lịch

| User ID | Role |
|---------|------|
| `#101` | 🟣 **OWNER** |
| `#107` | 🔵 **ANNOTATOR** |
| `#108` | 🟡 **REVIEWER** |

---

## 🧪 Kịch bản Test theo Chức năng

### 1. Xem danh sách Role & Quyền hạn
- Vào bất kỳ project nào → tab **Members**
- Bấm nút **"Bảng phân quyền"** (icon khiên 🛡️)
- ✅ Modal bảng ma trận hiện ra với 4 roles × các nhóm quyền

### 2. Mời thành viên mới (Invite)
- Vào `proj-001` → tab **Members** → **"+ Mời thành viên"**
- Nhập User ID: `109`, chọn role `annotator`
- ✅ Card preview quyền hạn cập nhật tức thì khi đổi role
- ✅ Bấm Submit → thành viên mới xuất hiện trong bảng

### 3. Test lỗi mời trùng (409 Conflict)
- Vào `proj-001` → mời lại User ID: `102` (đã là thành viên)
- ✅ Hiện thông báo lỗi đỏ: *"User 102 đã là thành viên của dự án này"*

### 4. Đổi Role thành viên
- Vào `proj-001` → tab **Members**
- Tìm `#102` (ADMIN) → dropdown đổi thành `reviewer`
- ✅ Role cập nhật ngay lập tức

### 5. Xóa thành viên
- Vào `proj-001` → bấm **"Xóa"** cạnh `#103` hoặc `#104`
- ✅ Confirm dialog xuất hiện trước khi xóa
- ✅ Sau xác nhận → thành viên biến khỏi danh sách

### 6. Test chặn xóa Owner (protected bởi business rule)
- Bấm **"Xóa"** cạnh `#101` (Owner)
- ✅ Nút Xóa **không hiển thị** cạnh Owner (protected bởi UI)
- Nếu gọi API thẳng: trả về `400 Bad Request`

### 7. Tạo project mới
- Bấm **"+ Tạo Project"** trên trang danh sách
- Điền tên, chọn loại (detection / ocr / nlp / ...)
- ✅ Project mới xuất hiện đầu danh sách với Owner là `#101`

---

## ⚙️ Lệnh chạy hệ thống

```powershell
# Chạy frontend (từ đúng thư mục web/)
cd "c:\Users\admin\OneDrive - The University of Technology\Desktop\dut-ai-data-platform\web"
pnpm dev
# → Mở trình duyệt: http://localhost:3000
```

```powershell
# Nếu báo lỗi port 3000 đã dùng, dừng tiến trình cũ:
taskkill /PID <số_PID_in_ra> /F
# Rồi chạy lại pnpm dev
```

---

## 🔧 Ghi chú kỹ thuật

| Mục | Chi tiết |
|-----|---------|
| Mock reset | Data reset **mỗi lần reload trang** (lưu in-memory) |
| Tắt mock | Đổi `NEXT_PUBLIC_API_MOCKING` trong `web/.env` thành giá trị khác |
| Network delay | Tất cả request mock có delay **200–400ms** mô phỏng network thật |
| MSW log | Mở DevTools → Console → tìm `[MSW] Mocking enabled` để xác nhận |
| Port conflict | Nếu port 3000 bị chiếm, Next.js tự dùng port 3001 |
