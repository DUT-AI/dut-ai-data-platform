# Bàn giao cho chủ nhiệm: thêm Data Platform vào Workspace Gateway

**Repo**: `DUT-AI-workspace`. **File**: `cloudflare/worker.js`. **Deploy**: `wrangler deploy` (Cloudflare, không phải server minipc).

Phía Data Platform đã sẵn sàng. Web chạy với `basePath=/data` sau hostname tunnel `dataplatform.dutai.io.vn`. Hostname này trỏ tới `http://localhost:3036` trên minipc và do người deploy Data Platform tự tạo.

## 1. Bắt buộc: thêm route `/data`

Trong `const ROUTES = { ... }`, thêm:

```js
  '/data': {
    upstream: 'https://dataplatform.dutai.io.vn',
    name: 'DUT-AI Data Platform',
  },
```

Không cần sửa logic proxy. Worker giữ nguyên path (`/data/...`) và header `X-Forwarded-Prefix`, đúng như Data Platform đang chờ.

## 2. Nên có: alias gốc

Đặt cạnh các alias `/manage`, `/lms`, `/meetly`:

```js
    if (pathname === '/data' || pathname === '/data/') {
      return Response.redirect(`${url.origin}/data/dashboard${search}`, 302);
    }
```

## 3. Tuỳ chọn: thẻ Portal và mục Waffle

Trong `renderWorkspaceHub`, thêm một mục waffle có `href="/data/dashboard"` và một thẻ `app-card`. Nội dung gợi ý:

- **Tiêu đề**: "DUT-AI Data Platform"
- **Mô tả**: "Quản lý dự án dữ liệu, dataset, ontology và gán nhãn huấn luyện AI."
- **Tag**: Dataset · Ontology · Gán nhãn

`renderErrorPage` có thể thêm nút "Về Data Platform".

## 4. Lưu ý đồng bộ spec Workspace

`specs/001-unified-app-portal/contracts/jwt-claims-schema.json` ghi claim `role_names` và `iat` là bắt buộc. Thực tế token Manage phát ra claim `roles` và không có `iat`. Worker đã đọc `payload.roles || payload.role_names` nên vẫn chạy đúng. Nên cập nhật lại spec cho khớp token thật.

## 5. Kiểm tra sau khi deploy Worker

1. `https://workspace.dutai.io.vn/data` → 302 tới `/data/dashboard`.
2. Mở `https://workspace.dutai.io.vn/data/dashboard` khi đã đăng nhập `/manage`: dashboard Data Platform hiện ra với tên người dùng.
3. Tắt container web của Data Platform: Worker hiện trang "DUT-AI Data Platform đang bảo trì".
