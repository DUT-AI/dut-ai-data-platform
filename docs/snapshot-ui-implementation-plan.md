# Kế hoạch Thực hiện UI cho Module Snapshot (Immutable Dataset Publishing)

## 1. Giới thiệu & Mục tiêu
- **Mục tiêu**: Xây dựng toàn bộ giao diện người dùng (UI) cho domain **Snapshot & Immutable Dataset Publishing** trong ứng dụng web (`web/src/features/snapshot` và tích hợp vào tab chi tiết dự án `web/src/features/projects/components/project-detail-view.tsx`).
- **Nguyên tắc cốt lõi (Bắt buộc theo chỉ đạo của User)**:
  1. **100% Real Backend & Database**: Toàn bộ dữ liệu được tải từ REST API backend (`/api/v1/projects/{project_id}/snapshots`, `/manifest`, `/items`, `/diff`, `/tags`).
  2. **Tuyệt đối KHÔNG hardcode & KHÔNG mock data**: Không sinh dữ liệu giả lập, không gán giá trị tĩnh làm giả kết quả.
  3. **KHÔNG silent fallback**: Khi API gặp lỗi mạng, server 500, validation 400, conflict 409 hoặc forbidden 403, UI phải giữ an toàn không bị sập (crash) bằng cách render thông báo lỗi rõ ràng (`Notice tone="danger"`, message chi tiết, mã lỗi và nút thử lại "Thử lại"), tuyệt đối không âm thầm nuốt lỗi hoặc fallback sang dữ liệu mẫu.
  4. **Tuân thủ DUT Frontend Rulebook**: `core-rules.md`, `component-rules.md`, Fira Code cho IDs/checksums, WCAG AA contrast, responsive 390px/1440px, trạng thái Loading/Empty/Error/Success đầy đủ, Lucide icons, không dùng `alert/confirm/prompt` nguyên bản của trình duyệt (dùng `ConfirmDialog`).

---

## 2. Purpose Gate (Theo mục 2 `core-rules.md`)
1. **User**: Project Owner, Admin, ML Engineer, Annotator, Reviewer.
2. **Purpose**: Đóng gói phiên bản dataset bất biến (frozen snapshot) cùng ontology đã công bố để phục vụ huấn luyện mô hình (ML training) và xuất dữ liệu (export); quản lý release tag; kiểm tra manifest & checksum; so sánh khác biệt (diff) giữa các snapshot.
3. **Data**: Thực thể `Snapshot`, `SnapshotManifest`, `SnapshotItem`, `ReleaseTag`, `SnapshotDiff` từ backend database thông qua FastAPI router `/api/v1/projects/{project_id}/snapshots`.
4. **Action**: Tạo snapshot mới, huỷ job đang tạo, xem chi tiết manifest/phân bố split, duyệt danh sách item phân trang keyset, gán/xoá release tag, so sánh 2 snapshot, lưu trữ (archive) hoặc xoá vĩnh viễn (purge - chỉ Owner).
5. **Placement**: Nằm tại tab "Đóng gói (Snapshots)" trong màn hình chi tiết dự án (`/projects/[id]?tab=snapshots`).
6. **Reuse**: Tái sử dụng các UI primitives chuẩn: `Button`, `Badge`, `Card`, `Notice`, `EmptyState`, `Dialog`, `ConfirmDialog`, `Input`, `Form`.
7. **States**: Đầy đủ 6 trạng thái: Loading (skeleton), Empty (chưa có snapshot nào), Error (thông báo lỗi chi tiết, mã lỗi, nút refetch), Disabled (khi đang submit mutation hoặc không đủ quyền), Permission-denied (chỉ Owner mới purge), Success (cập nhật danh sách qua invalidate query).
8. **Responsive**: Tối ưu từ 390px (mobile card layout, scroll ngang cho tab/table, bottom drawer/dialog) đến 1440px (desktop data table, split comparison side-by-side).

---

## 3. Kiến trúc Module `web/src/features/snapshot`

```text
web/src/features/snapshot/
├── types/
│   └── index.ts                # TypeScript interfaces tương ứng 100% Pydantic DTOs backend
├── api/
│   └── snapshot-api.ts         # Axios client gọi trực tiếp API backend không mock
├── hooks/
│   └── use-snapshot.ts         # TanStack React Query hooks cho caching, refetching, mutations
├── components/
│   ├── snapshot-tab-view.tsx    # Giao diện chính của tab Snapshots trong ProjectDetailView
│   ├── create-snapshot-modal.tsx# Modal tạo Snapshot: chọn Dataset Version, Ontology Version, split ratio, policy
│   ├── snapshot-card.tsx       # Component hiển thị từng Snapshot kèm badge trạng thái & quick actions
│   ├── snapshot-manifest-modal.tsx # Modal xem chi tiết Manifest (checksum SHA-256, storage URI, class distribution)
│   ├── snapshot-items-modal.tsx # Modal xem danh sách Items phân trang Keyset/Cursor & lọc theo Split (train/val/test)
│   ├── snapshot-diff-modal.tsx  # Modal so sánh 2 Snapshot (KPIs thêm/bớt/sửa/đổi split & item deltas)
│   └── manage-tags-modal.tsx    # Modal quản lý Release Tags (gán tag 'production', 'staging'...)
└── index.ts                    # Barrel export
```

---

## 4. Các giai đoạn triển khai (Phased Implementation Plan)

### Giai đoạn 1: Foundation (Types, API Client, React Query Hooks & Tab Integration)
- [x] Tạo `web/src/features/snapshot/types/index.ts` ánh xạ đầy đủ DTOs từ `modules/snapshot/application/dtos/snapshot_dtos.py`.
- [x] Tạo `web/src/features/snapshot/api/snapshot-api.ts` kết nối tới backend endpoints:
  - `POST /projects/{project_id}/snapshots`
  - `GET /projects/{project_id}/snapshots`
  - `GET /projects/{project_id}/snapshots/{snapshot_id}`
  - `POST /projects/{project_id}/snapshots/{snapshot_id}/cancel`
  - `DELETE /projects/{project_id}/snapshots/{snapshot_id}?purge=bool`
  - `GET /projects/{project_id}/snapshots/{snapshot_id}/manifest`
  - `GET /projects/{project_id}/snapshots/{snapshot_id}/items`
  - `GET /projects/{project_id}/snapshots/diff`
  - `GET /projects/{project_id}/snapshots/diff/items`
  - `POST /projects/{project_id}/snapshots/{snapshot_id}/tags`
  - `GET /projects/{project_id}/tags`
  - `DELETE /projects/{project_id}/tags/{name}`
- [x] Tạo `web/src/features/snapshot/hooks/use-snapshot.ts` với đầy đủ query và mutation hooks.
- [x] Cập nhật `web/src/features/projects/components/project-detail-view.tsx` bổ sung tab "snapshots" với icon `Layers` / `PackageCheck`.

### Giai đoạn 2: Danh sách Snapshot & Quản lý vòng đời (Tab View & Lifecycle)
- [x] Xây dựng `snapshot-tab-view.tsx`:
  - Bộ lọc trạng thái: Tất cả, READY, CREATING, ARCHIVED, FAILED.
  - Cơ chế Polling thông minh: tự động refetch mỗi 3-5 giây khi có snapshot ở trạng thái `CREATING` cho đến khi chuyển sang `READY` hoặc `FAILED`.
  - Empty state rõ ràng với nút "Tạo Snapshot đầu tiên".
  - Báo lỗi rõ ràng với `Notice tone="danger"` khi query thất bại.
- [x] Xây dựng `snapshot-card.tsx`:
  - Hiển thị version name, release tags, dataset/ontology version ID, policy, tỷ lệ split.
  - Badge trạng thái màu chuẩn (READY: emerald, CREATING: sky/amber pulse, ARCHIVED: slate, FAILED: rose kèm tooltip lỗi).
  - Hành động: Xem Manifest, Duyệt Items, So sánh Diff, Gán Tag, Huỷ Job (nếu CREATING), Lưu trữ (Archive) hoặc Xoá vĩnh viễn (Purge - chỉ Owner).

### Giai đoạn 3: Form tạo Snapshot mới (Create Snapshot Modal)
- [x] Xây dựng `create-snapshot-modal.tsx`:
  - Chọn Dataset và Dataset Version thực tế từ API `/projects/{project_id}/datasets`.
  - Chọn Ontology Version đã Publish thực tế từ API `/projects/{project_id}/ontologies`.
  - Nhập tên phiên bản tuỳ chọn (gợi ý `v1.0.0` hoặc để trống để backend auto-generate `v1, v2...`).
  - Chọn `selection_policy`: `LATEST_APPROVED` (mặc định) hoặc `LATEST_SUBMITTED`.
  - Toggle `include_unannotated` (Bao gồm dữ liệu chưa gán nhãn làm negative samples).
  - Chọn `split_strategy`: `STRATIFIED` (phân tầng theo class) hoặc `RANDOM`.
  - Cấu hình tỷ lệ Train / Validation / Test với thanh trượt hoặc input số, kèm validation trực tiếp tổng phải đúng bằng 1.0 (100%).
  - Split seed (mặc định 42).
  - Hiển thị lỗi backend trực tiếp nếu có xung đột phiên bản (409) hoặc dữ liệu không hợp lệ (400).

### Giai đoạn 4: Chi tiết Manifest & Duyệt Items (Manifest & Items Viewer)
- [x] Xây dựng `snapshot-manifest-modal.tsx`:
  - Thống kê tổng số asset, annotation.
  - Checksum tổng SHA-256 (`aggregate_checksum`) hiển thị dạng Fira Code kèm nút sao chép.
  - Đường dẫn S3 Storage URI (`storage_uri`).
  - Biểu đồ phân bố Split (Train, Validation, Test count & percentage).
  - Bảng thống kê phân bố Class/Category theo từng split.
- [x] Xây dựng `snapshot-items-modal.tsx`:
  - Danh sách items đóng gói với phân trang Cursor/Keyset streaming.
  - Lọc theo split (`train`, `validation`, `test`).
  - Cột Asset ID, Annotation Revision ID, Item Checksum SHA-256, Sort order.

### Giai đoạn 5: So sánh Snapshot (Snapshot Diff Service)
- [x] Xây dựng `snapshot-diff-modal.tsx`:
  - Cho phép người dùng chọn Base Snapshot (A) và Target Snapshot (B).
  - Hiển thị KPIs tổng hợp: Số asset thêm mới (+), số asset bị loại bỏ (-), số asset có revision thay đổi (~), số asset chuyển split.
  - Bảng biến động số lượng nhãn theo từng category (Class distribution deltas: +/-, biểu thị tăng giảm).
  - Bảng chi tiết item-level delta có phân trang theo `change_type` (`added`, `removed`, `modified`, `split_changed`).

### Giai đoạn 6: Quản lý Release Tags & Xác nhận huỷ/xoá
- [x] Xây dựng `manage-tags-modal.tsx`:
  - Xem danh sách tags hiện có trong project.
  - Gán tag mới cho snapshot (ví dụ: `production`, `staging`, `benchmark-v1`).
  - Xoá tag (với quyền Owner/Admin).
- [x] Tích hợp `ConfirmDialog` cho các hành động nhạy cảm:
  - Huỷ snapshot đang chạy (`POST /cancel`).
  - Lưu trữ snapshot (`DELETE` soft delete).
  - Xoá vĩnh viễn (`DELETE ?purge=true` - cảnh báo nguy hiểm chỉ Owner được thực hiện).

### Giai đoạn 7: Kiểm thử, Typecheck, Build & Nghiệm thu
- [x] Chạy `npx --no-install tsc --noEmit` kiểm tra 0 lỗi TypeScript.
- [x] Kiểm tra responsive 390px và 1440px.
- [x] Xác nhận không có bất kỳ mock data hay hardcoded fallback nào.

