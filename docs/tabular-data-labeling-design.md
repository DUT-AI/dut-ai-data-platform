# Thiết Kế Kiến Trúc & UI Gán Nhãn Dữ Liệu Dạng Bảng (Tabular Data Labeling)

> **Tài liệu thiết kế kỹ thuật (Technical Design Document)**  
> **Dự án:** DUT AI Data Platform  
> **Module:** Frontend Annotation Workspace (`web/src/features/annotation`)  
> **Trạng thái:** Bản thảo thiết kế (Draft Proposal) — Chờ review trước khi thực hiện  

---

## 1. Kiến Trúc Hệ Thống Hiện Tại (Current Project Architecture)

### 1.1. Frontend Architecture
* **Core Stack:** **Next.js 16.2.4 (App Router)**, **React 19.2.4**, TypeScript 5, Tailwind CSS v4 (`@tailwindcss/postcss: ^4`).
* **Routing Architecture:** Next.js App Router với Route Groups:
  * Route ứng dụng chính: `src/app/(protected)/` gồm `/dashboard`, `/users`, `/projects`.
  * Không gian gán nhãn tập trung: `src/app/(protected)/projects/[id]/annotate/[assetId]/page.tsx` nhận các search params: `ontologyVersionId`, `datasetVersionId`.
* **Feature-Driven Architecture:** Phân tách rõ ràng trong `src/features/`:
  * `annotation/`: Quản lý workspace, registry editor, canvas, timeline, tools, command hotkeys, outliner, history.
  * `dataset/`: Quản lý Dataset, Version, Asset Gallery, List Table, Metadata Extractor.
  * `ontology/`: Quản lý Ontology, Input/Output Definitions, Category Taxonomy, Schema Export.
  * `projects/`: Quản lý thông tin dự án, cấu trúc Tab (`overview`, `datasets`, `ontology`, `members`, `settings`).
* **State Management & Data Layer:**
  * **Server State:** `@tanstack/react-query: ^5.100.10` quản lý cache, invalidate, optimistic update và refetch.
  * **Client / UI State:** React Local State (`useState`, `useReducer`, `useMemo`, `useCallback`) kết hợp React Contexts (`CommandRegistryProvider`, `ToolManagerProvider`).
  * **Forms & Schema:** `react-hook-form: ^7.83.0` kết hợp `zod: ^4.4.3` và `@hookform/resolvers`.
  * **Hotkeys:** `@tanstack/react-hotkeys: ^0.10.0` tích hợp tập trung trong registry lệnh.
* **Component Primitives:** Thư mục `src/components/ui/` chuẩn hóa trên Radix UI (`@radix-ui/react-slot`), `cva`, `clsx`, `tailwind-merge`.

### 1.2. Backend & Data Architecture
* **Stack:** Python FastAPI, SQLAlchemy (asyncpg), Dishka Dependency Injection, Alembic, Pydantic v2.
* **Cấu trúc phân cấp dữ liệu:** `Project` $\rightarrow$ `Dataset` $\rightarrow$ `DatasetVersion` $\rightarrow$ `Asset` (tập tin vật lý lưu trữ trên MinIO/S3, quản lý trong bảng `assets`).
* **Mô hình Entity Gán nhãn:**
  * `AnnotationModel` (`annotations`): Quản lý `asset_id`, `project_id`, `target_type` (`FULL_ASSET`, `RECORD`, `TEXT_SPAN`, `TIME_RANGE`, `FRAME_RANGE`, `DOCUMENT_PAGE`), `target_selector` (JSONB).
  * `AnnotationRevisionModel` (`annotation_revisions`): Quản lý lịch sử bất biến theo phiên bản (`revision_number`), `ontology_version_id`, `results` (JSONB), `category_ids` (JSONB), `source` (`human` | `machine`).

---

## 2. Các Pattern UI & Annotation Hiện Có (Existing Patterns)

Tabular Labeling **bắt buộc kế thừa** các quy chuẩn thiết kế của hệ thống:

1. **Hợp đồng Props Chuẩn (`BaseEditorComponentProps`):**
   Mọi Editor trong hệ thống (`BoundingBoxEditor`, `PolygonSegmentationEditor`, `NerAnnotationCanvas`, `TextClassificationCanvas`, `AudioAnnotationCanvas`, v.v.) đều nhận chung một giao diện props chuẩn từ `editor-registry.tsx`:
   ```typescript
   export interface BaseEditorComponentProps {
     assetUrl?: string;
     results: AnnotationResult[];
     categoryColors?: Record<string, string>;
     categoryNames?: Record<string, string>;
     selectedCategoryId?: string | null;
     availableCategories?: Array<{ id: string; name: string; color?: string | null; key: string }>;
     readOnly?: boolean;
     onChange?: (results: AnnotationResult[]) => void;
     metadata?: Record<string, unknown>;
   }
   ```
2. **Không gian làm việc tập trung (Focused Workspace Surface):**
   * Bảng màu tối chống lóa (`bg-slate-950`, `bg-slate-900`, `border-slate-800`), font monospace (`font-mono`) cho mã định danh, số liệu, giá trị dữ liệu và hotkey.
3. **Workspace Header & Stepper:**
   * Hiển thị: Nút quay lại Dataset, tên file/asset, số thứ tự trong hàng đợi (`Asset current / total`), nút Previous/Next (`[` / `]`), nút Lưu (`Ctrl+S`), nút Toàn màn hình (`F`), Hướng dẫn (`H`), Cài đặt Hotkeys.
4. **Workspace Category Bar (Palette nhãn 1-9):**
   * Thanh legend nhãn động sinh ra từ Ontology Schema, gán sẵn phím tắt số `1` đến `9`. Khi annotator nhấn phím tắt, nhãn gán hiện tại sẽ đổi ngay lập tức.
5. **Fail-Fast Error Boundaries:**
   * Khi Input Modality hoặc Output Definition không tương thích, hiển thị Fallback cảnh báo có hướng dẫn phục hồi thay vì crash hay fallback ngầm sang editor khác.
6. **Cảnh báo rời trang khi có thay đổi chưa lưu (`beforeunload`):**
   * So sánh hash `serializeAnnotationResults(workingResults) !== savedResultsHash` để chặn mất dữ liệu khi người dùng vô tình reload hoặc back trang.

---

## 3. Thành Phần Tái Sử Dụng (Existing Reusable Components)

| Phân hệ / Nhu cầu | Component Hiện Có | Trạng Thái | Đánh Giá Tái Sử Dụng |
| :--- | :--- | :--- | :--- |
| **Workspace Wrapper** | `AnnotationWorkspaceView` | **Tái sử dụng 100%** | Khung chuẩn của toàn bộ hệ thống (Header, Category Bar, Sidebar, Hotkey Manager). |
| **Dispatcher** | `AnnotationEditorDispatcher` | **Tái sử dụng & Mở rộng map** | Điều phối mount component từ `editor-registry.tsx`. |
| **Header điều khiển** | `WorkspaceHeader` | **Tái sử dụng 100%** | Quản lý tên file, tiến trình asset, save, hotkeys, fullscreen. |
| **Thanh chọn nhãn** | `WorkspaceCategoryBar` | **Tái sử dụng 100%** | Chọn category nhãn nhanh (phím 1-9), màu sắc đồng bộ từ Ontology. |
| **Thanh bên (Sidebar)** | `WorkspaceSidebar` | **Tái sử dụng** | Quản lý lịch sử revisions, diff, danh sách đối tượng gán nhãn. |
| **Nút bấm (Buttons)** | `Button` (`src/components/ui/button.tsx`) | **Tái sử dụng 100%** | Các biến thể: `default`, `outline`, `secondary`, `destructive`, `ghost`. |
| **Badge trạng thái** | `Badge` (`src/components/ui/badge.tsx`) | **Tái sử dụng 100%** | Hiển thị nhãn, loại dữ liệu, trạng thái dòng (`success`, `warning`, `info`, `neutral`). |
| **Hộp thoại xác nhận** | `ConfirmDialog` (`src/components/ui/confirm-dialog.tsx`) | **Tái sử dụng 100%** | Dùng khi xóa nhãn hàng loạt, reset dữ liệu bẩn. |
| **Trạng thái rỗng** | `EmptyState` (`src/components/ui/empty-state.tsx`) | **Tái sử dụng 100%** | Dùng khi bảng không có dữ liệu, không có kết quả filter. |
| **Ô nhập liệu** | `Input` (`src/components/ui/input.tsx`) | **Tái sử dụng 100%** | Dùng cho search ô/dòng, nhập giá trị số (Regression). |
| **Bảng Tabular hiện tại** | `TableAnnotationCanvas` (`src/features/annotation/components/tabular/table-annotation-canvas.tsx`) | **Thay thế / Refactor toàn diện** | **[HIỆN CÓ]:** File này hiện chỉ là prototype thô sơ (271 dòng), chỉ cho click vào từng ô độc lập (`result_type: "table_cell"`), không có phân trang, không ảo hóa, không hỗ trợ gán nhãn dòng/bản ghi. Cần viết lại thành một Datagrid chuyên nghiệp. |

---

## 4. Quy Trình Dữ Liệu Hiện Tại (Dataset / Annotation Flow)

```text
Projects List (/projects)
   ↓
Project Detail (/projects/[id]?tab=datasets)
   ↓
Dataset Version View (chọn Version -> Asset List Table / Gallery Grid)
   ↓ Click vào một Asset (File CSV/JSON/TSV) -> Mở AssetDetailModal
   ↓ Click "Bắt đầu gán nhãn"
Annotation Workspace (/projects/[id]/annotate/[assetId]?ontologyVersionId=...&datasetVersionId=...)
   ↓
AnnotationWorkspaceView tải:
   - Project info (`useProjectQuery`)
   - Ontology Schema (`useOntologySchemaQuery`)
   - Asset Download URL (`useAssetDownloadUrlQuery`)
   - Asset Annotations & Revisions (`useAssetAnnotationsQuery`)
   - Asset Queue trong Version (`useVersionAssetsQuery`)
   ↓
AnnotationEditorDispatcher giải quyết component theo:
   effectiveInputType ("tabular") & primaryOutputType ("classification" / "number" / ...)
   ↓
Annotator thao tác gán nhãn trên giao diện
   ↓
Nhấn "Lưu" (Ctrl+S) hoặc "Lưu & Tiếp tục"
   ↓
Gọi API:
   - Nếu chưa có Annotation: POST /api/v1/annotations (target_type: "FULL_ASSET" / "RECORD")
   - Nếu đã có Annotation: POST /api/v1/annotations/{id}/revisions
   ↓
Next Asset trong hàng đợi (nhấn phím "]" hoặc click Next trên Header)
```

* **Autosave:** **[HIỆN TẠI CHƯA CÓ]** — Hệ thống đang dùng cơ chế Manual Save (`handleQuickSubmitNewRevision`) kích hoạt qua nút bấm hoặc phím tắt `Mod+S`.
* **Draft State:** Được theo dõi thông qua `hasUnsavedChanges` (so sánh hash `workingResultsHash !== savedResultsHash`), kích hoạt cờ cảnh báo `beforeunload`.
* **Queue Navigation:** Hỗ trợ phím tắt `[` (Previous Asset) và `]` (Next Asset).

---

## 5. Phân Tích Bất Cập & Vấn Đề Cần Giải Quyết (Problems & Gaps)

1. **Bản chất bài toán ML dạng bảng (Row vs Cell):**
   * Trong 95% bài toán Tabular AI (dự đoán churn, chấm điểm tín dụng, phát hiện gian lận, v.v.), **đơn vị cần gán nhãn là một DÒNG (Row / Record)** chứ không phải một ô lẻ tẻ.
   * Prototype cũ chỉ hỗ trợ click ô (`table_cell`) với tọa độ dòng `row` và cột `col_name`, không hỗ trợ bài toán gán nhãn nhị phân, đa lớp hay hồi quy cho từng bản ghi.
2. **Quy tắc bất biến về Định vị Record (`record_key`):**
   * Theo tài liệu kiến trúc `docs/Annotation Domain 3a898e2c5a1d80a3a935ce6375f3566f.md`:
     > *Tuyệt đối không dùng số thứ tự dòng tạm thời (`row_index`) làm `record_key`, bởi vì khi file bị shuffle, sắp xếp lại hoặc re-partition, vị trí dòng sẽ thay đổi làm sai lệch toàn bộ nhãn! Bắt buộc dùng cột khóa chính tự nhiên (`id`, `uuid`, `code`) hoặc cột do hệ thống sinh (`__row_id__`).*
3. **Hiệu năng & Tải dữ liệu lớn:**
   * Một file tabular tải xuống có thể từ 1.000 đến 100.000 dòng.
   * Nếu render toàn bộ DOM dạng HTML `<table>` truyền thống như prototype hiện tại, trình duyệt sẽ bị lag/crash khi vượt quá 1.000 dòng.
   * Bắt buộc phải có **Virtualization** (ảo hóa danh sách dòng) và **Client-side Pagination/Windowing**.
4. **Cơ chế lưu trữ nhiều dòng trong 1 Asset:**
   * Khi 1 file CSV là 1 Asset, nó chứa $N$ dòng (`scope: "MANY_ITEMS"`).
   * Backend hiện tại lưu 1 danh sách `results: list[dict]` trong `AnnotationRevisionModel`. Mỗi kết quả gán nhãn cho 1 dòng sẽ là 1 phần tử trong mảng `results`.

---

## 6. Xác Định Các Loại Labeling Cần Hỗ Trợ

Tương thích trực tiếp với các `OutputDefinition` trong Ontology Platform:

### 6.1. Binary Classification (Phân loại nhị phân theo dòng)
* **Ontology Output:** `code: "classification"`, `multiple: false`, danh mục gồm đúng 2 categories (ví dụ: `Fraud` / `Legitimate`, `Yes` / `No`).
* **Biểu diễn UI:** Nút toggle 2 trạng thái nhanh (Segmented Toggle / Pill Button) hoặc phím tắt toggle (phím `1` và `2`).

### 6.2. Multi-class Classification (Phân loại đa lớp đơn nhãn)
* **Ontology Output:** `code: "classification"`, `multiple: false`, danh mục $\ge 3$ categories (ví dụ: `Thấp` / `Trung bình` / `Cao` / `Rất cao`).
* **Biểu diễn UI:** Dropdown select compact hoặc Popover xuất hiện tại cell nhãn của dòng đó. Hỗ trợ bấm phím số `1`-`9` tương ứng với Category Bar.

### 6.3. Multi-label Classification (Phân loại đa nhãn)
* **Ontology Output:** `code: "classification"`, `multiple: true`, danh mục nhiều categories.
* **Biểu diễn UI:** Tag group dạng compact với dấu `+`, click mở menu checkbox chọn nhiều nhãn đồng thời.

### 6.4. Regression / Numerical Scoring (Hồi quy / Chấm điểm số)
* **Ontology Output:** `code: "number"`, có hoặc không có `value_schema` (ví dụ `minimum: 0`, `maximum: 100`).
* **Biểu diễn UI:** Input số trực tiếp tại cột Label (`type="number"`) với bước nhảy (step), phím `Enter` để lưu và tự động nhảy xuống dòng tiếp theo.

### 6.5. Structured / Cell-level Anomaly Tagging (Chế độ phụ - giữ tương thích ngược)
* **Ontology Output:** `code: "tabular"` hoặc `custom_object`.
* **Biểu diễn UI:** Click từng ô để đánh dấu lỗi dữ liệu / PII / giá trị bất thường.

---

## 7. Trải Nghiệm Người Dùng Đề Xuất (UX Analysis)

### Khi tương tác với một dòng dữ liệu (Row Labeling):
* **Cột nhãn cố định:** Cột nhãn (Target Label Column) luôn được cố định ở mép phải dưới dạng **Inline Quick-Control**. Với Single-class (dưới 4 nhãn): hiển thị trực tiếp các nút chọn nhanh; với trên 4 nhãn: hiển thị Badge hiện tại, click mở Quick-Select Popover.
* **Tự động chuyển dòng (Auto-advance):** Khi annotator bấm phím tắt gán nhãn cho dòng hiện tại (ví dụ bấm `1` để gán nhãn A), hệ thống gán nhãn và **tự động focus xuống dòng tiếp theo** $\rightarrow$ Tối ưu hóa tốc độ gán nhãn hàng trăm dòng mà không cần dùng chuột.

### Khi gán nhãn nhiều dòng cùng lúc (Bulk Labeling):
* Checkbox chọn tất cả ở Header (`Select All on Page` hoặc `Select All Filtered`).
* Checkbox ở từng dòng; hỗ trợ giữ phím `Shift + Click` để chọn dải liên tục nhiều dòng (Range Selection).
* Khi có $\ge 1$ dòng được chọn: Thanh **Bulk Action Floating Bar** xuất hiện ở đáy bảng với các hành động: `Gán nhãn [Category ▼]`, `Xóa nhãn đã gán`, `Đánh dấu cần xem lại`.

### Cơ chế Lưu dữ liệu (Save Strategy):
* **Local In-memory Immediate State:** Mọi thay đổi gán nhãn cập nhật ngay lập tức vào `workingResults`.
* **Auto-draft & Debounced Save:** 
  * Cung cấp tùy chọn **Autosave** (tự động lưu lên server sau mỗi 30 giây nếu có thay đổi hoặc debounce 2 giây sau thao tác cuối).
  * Vẫn giữ nút **"Lưu thay đổi" (`Mod+S`)** truyền thống để annotator chủ động kiểm soát.
  * Khi annotator chuyển trang phân trang (pagination) trong cùng 1 asset: dữ liệu được lưu trong bộ nhớ tạm thời (`workingResults`), không ép buộc phải đẩy HTTP request liên tục gây nghẽn mạng.

### Khi di chuyển giữa các Assets (Dataset File):
* Nếu có thay đổi chưa lưu, hiển thị Dialog cảnh báo: *"Bạn có thay đổi chưa lưu trên tập tin này. Lưu trước khi tiếp tục?"* (với các tùy chọn: `Lưu & Tiếp tục`, `Hủy thay đổi`, `Ở lại`).

### Xử lý lỗi & Hoàn tác:
* **Undo/Redo:** Tích hợp `Ctrl+Z` để hoàn tác thao tác gán nhãn vừa thực hiện trong phiên làm việc.
* **Reset Row:** Nút xóa nhãn nhanh trên từng dòng để đưa dòng về trạng thái chưa gán (`Unlabeled`).

---

## 8. Đề Xuất Bố Cục Giao Diện (Proposed UI Layout)

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ [← Quay lại Dataset]  file_churn_data.csv  [1 / 14 Assets]  [ < Trước ] [ Sau > ]   [💾 Lưu]   │ <- WorkspaceHeader
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Nhãn (Phím tắt): [1] Không rời bỏ (0)  [2] Rời bỏ (1)  [3] Nghi vấn (?)             [⚙ Phím tắt]│ <- WorkspaceCategoryBar
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Tìm kiếm giá trị...] [Bộ lọc: Tất cả / Đã gán / Chưa gán ▼] [👁 Cột ▼]    Tiến độ: 142/500│ <- TabularToolbar
├────┬─────────────┬──────────────┬──────────────┬──────────────┬──────────────────────────────┤
│ ☑  │ record_id 📌│ age          │ total_spend  │ tenure_month │ TARGET LABEL (Gán nhãn) 📌   │ <- Header cố định
├────┼─────────────┼──────────────┼──────────────┼──────────────┼──────────────────────────────┤
│ 🔲 │ rec_00101   │ 34           │ $1,240.50    │ 12           │ [ Không rời bỏ (0) ]         │ <- Dòng đã gán
│ 🔲 │ rec_00102   │ 52           │ $340.00      │ 3            │ [ Rời bỏ (1)       ]         │
│ 🔘 │ rec_00103   │ 28           │ $5,420.00    │ 24           │ [ Chọn nhãn... ▼   ] ◄ Active│ <- Dòng đang focus
│ 🔲 │ rec_00104   │ 41           │ $890.20      │ 8            │ [ Chưa gán         ]         │
│ 🔲 │ rec_00105   │ 63           │ $2,100.00    │ 36           │ [ Không rời bỏ (0) ]         │
├────┴─────────────┴──────────────┴──────────────┴──────────────┴──────────────────────────────┤
│ [ 5 dòng được chọn ] -> Gán nhãn hàng loạt: [ Chọn nhãn ▼ ] [ Xóa nhãn ]                      │ <- Bulk Floating Bar
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Trang 1 / 10 (Hiển thị 50 dòng/trang)    [◄ Trang trước] [1] [2] [3]... [Trang sau ►]       │ <- TabularFooter
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Cấu Trúc Component Đề Xuất (Component Architecture)

```text
web/src/features/annotation/components/tabular/
│
├── tabular-annotation-workspace.tsx      # Entry component (thay thế table-annotation-canvas.tsx)
│   │                                     # Nhận BaseEditorComponentProps
│   │
│   ├── tabular-toolbar.tsx               # Tìm kiếm, filter (Labeled/Unlabeled), chọn hiển thị cột
│   │
│   ├── tabular-data-grid.tsx             # Container bảng cuộn, cố định cột, quản lý cell active
│   │   ├── tabular-grid-header.tsx       # Tiêu đề cột, sort icon, select all checkbox
│   │   ├── tabular-grid-row.tsx          # Dòng dữ liệu (Memoized để tối ưu re-render)
│   │   │   ├── tabular-data-cell.tsx     # Ô dữ liệu thông thường (truncate text, tooltip khi hover)
│   │   │   └── tabular-label-cell.tsx    # Ô gán nhãn tương thích (Classification / Number / Multi)
│   │   └── tabular-empty-grid.tsx        # Trạng thái rỗng khi filter không có dòng nào
│   │
│   ├── tabular-bulk-action-bar.tsx       # Thanh nổi khi chọn nhiều dòng (Gán nhãn hàng loạt)
│   │
│   ├── tabular-pagination.tsx            # Phân trang client-side / windowing navigation
│   │
│   └── modals/
│       └── tabular-column-config-modal.tsx # Modal tùy chọn thứ tự và ẩn/hiện các cột feature
```

---

## 10. Mô Hình Quản Lý State (State Architecture)

### 10.1. Cấu trúc State chuẩn hóa

* **Server State (`@tanstack/react-query`):**
  * `assetUrl`: Presigned download URL để tải file CSV/JSON.
  * `ontologySchema`: Output definitions, categories, allowed formats.
  * `existingAnnotations`: Danh sách bản ghi annotation đã lưu trước đó.
* **Client Data State:**
  * `dataRows: Array<Record<string, unknown>>`: Danh sách dòng đã parse từ file.
  * `headers: string[]`: Danh sách tên cột.
  * `primaryKeyCol: string`: Cột định danh (hoặc cột tự sinh `__row_id__`).
* **UI & Interaction State:**
  * `pageIndex: number`, `pageSize: number`: Vị trí trang hiện tại.
  * `searchQuery: string`: Từ khóa tìm kiếm.
  * `filterStatus: "all" | "labeled" | "unlabeled"`: Bộ lọc dòng.
  * `sortColumn: string | null`, `sortDirection: "asc" | "desc"`: Sắp xếp.
  * `selectedRowKeys: Set<string>`: Danh sách dòng đang được tích chọn checkbox.
  * `focusedRowKey: string | null`: Dòng đang nhận focus bàn phím.
* **Working Annotation Results:**
  * `workingResults: AnnotationResult[]`: Kết quả gán nhãn trong phiên làm việc.
  * Mỗi phần tử tương ứng với 1 dòng dữ liệu:
    ```typescript
    interface TabularRecordResult extends AnnotationResult {
      id: string;                      // "rec_result__{record_key}"
      output_id?: string;             // ID của OutputDefinition trong Ontology
      result_type: "classification" | "number" | "text";
      category_id?: string | null;     // ID của Category được chọn
      value?: unknown;                 // Giá trị nhãn
      geometry?: {
        record_key: string;            // Khóa chính bất biến của dòng
        key_field: string;             // Tên cột khóa chính
        row_index?: number;            // Vị trí dòng ban đầu (tham khảo)
      };
      created_at: string;
    }
    ```

---

## 11. Yêu Cầu Backend & API (API Requirements & Gaps)

### 11.1. Hiện trạng ĐÃ HỖ TRỢ:
* `GET /api/v1/assets/{asset_id}/annotations`: Lấy toàn bộ annotations của asset (có param `target_type`).
* `POST /api/v1/annotations`: Tạo mới annotation (nhận `results: list[dict]`, `target_type`, `target_selector`).
* `POST /api/v1/annotations/{id}/revisions`: Tạo revision mới cho annotation đã có.
* `GET /api/v1/assets/{asset_id}/download-url`: Lấy presigned URL tải file CSV/JSON về client.

### 11.2. Các Gap / Kiến nghị Cần Lưu Ý:
1. **Dung lượng Payload Revision:** Khi file bảng có $\ge 5.000$ dòng đã gán nhãn, lưu tất cả trong 1 mảng JSONB `results` của `AnnotationRevision` có thể làm tăng dung lượng database. Trước mắt vẫn tương thích tốt, về lâu dài có thể hỗ trợ cơ chế lưu theo block/chunk bản ghi.
2. **Khóa chính dữ liệu:** Bắt buộc client tự động nhận diện cột `id` / `uuid` / `code`. Nếu không có, client tự sinh `__row_id__` dựa trên hash nội dung dòng để đảm bảo tính bất biến khi filter hoặc sort.

---

## 12. Quản Lý Hiệu Năng (Performance Considerations)

1. **Phân trang Client-side (Pagination First):**
   * Mặc định chia bảng thành 25 / 50 / 100 dòng mỗi trang để duy trì số lượng DOM node nhỏ nhẹ ($< 1.000$ elements).
2. **Bộ nhớ ảo hóa (Virtual Scrolling):**
   * Hỗ trợ chế độ cuộn vô tận với windowing (chỉ render ~30 dòng hiển thị trong viewport).
3. **Web Worker cho việc parse CSV/JSON:**
   * Chuỗi CSV hàng chục MB được parse ở background thread để tránh làm đơ giao diện khi vừa tải file.
4. **Memoization tối đa (`React.memo` cho Table Rows):**
   * Khi annotator gán nhãn 1 dòng, chỉ duy nhất dòng đó re-render, các dòng khác giữ nguyên.

---

## 13. Xử Lý Các Trường Hợp Ngoại Lệ (Edge Cases)

* **File rỗng (0 dòng):** Hiển thị `EmptyState` kèm thông báo rõ ràng và nút chuyển asset tiếp theo.
* **File nhiều cột ($> 50$ cột):** Cố định cột ID (trái) và cột Label (phải), các cột ở giữa cho phép cuộn ngang kèm menu ẩn/hiện cột.
* **Text quá dài:** Tự động cắt ngắn (`truncate`) ô, hover chuột hiển thị popover/tooltip xem toàn bộ.
* **Dữ liệu Missing/Null:** Hiển thị badge mờ `null` hoặc `NaN` có màu slate để phân biệt với chuỗi rỗng `""`.
* **Mất kết nối mạng khi Lưu:** Bắt lỗi HTTP, giữ nguyên trạng thái dirty, hiển thị thanh thông báo lỗi màu đỏ kèm nút `Thử lưu lại` (Retry).
* **Rời trang khi có thay đổi chưa lưu:** Kích hoạt Dialog xác nhận rời trang và sự kiện `window.beforeunload`.

---

## 14. Trải Nghiệm Bàn Phím (Keyboard Navigation)

* `↑` / `↓` hoặc `J` / `K`: Di chuyển focus lên / xuống giữa các dòng.
* `1` đến `9`: Gán ngay Category tương ứng cho dòng đang focus (và tự động nhảy xuống dòng kế tiếp).
* `Space`: Tích chọn / Bỏ chọn checkbox của dòng hiện tại (để gom nhóm thao tác hàng loạt).
* `Delete` / `Backspace`: Xóa nhãn của dòng đang focus.
* `Enter`: Mở nhanh popover chọn nhãn nếu danh mục quá nhiều lớp.
* `Mod + S` (`Ctrl+S` / `Cmd+S`): Lưu phiên bản gán nhãn hiện tại.
* `[` / `]`: Chuyển sang file Asset trước / file Asset sau trong dataset queue.
* `Mod + Z`: Hoàn tác (Undo) thao tác gán nhãn gần nhất.

---

## 15. Kế Hoạch Triển Khai (Implementation Plan)

```text
Phase 1: Grid Skeleton & Data Loading
- Xây dựng layout Datagrid cố định 2 đầu (Pinned ID & Pinned Label Column).
- Viết parser CSV/JSON (có hỗ trợ Web Worker / Streaming).
- Tích hợp thanh phân trang Client-side (25, 50, 100 dòng).
- Bổ sung mock data tabular để kiểm thử hiển thị.

Phase 2: Labeling Interactions & Modality Handlers
- Tích hợp cột Target Label:
  + Chế độ Binary / Single-class (Pill buttons hoặc Quick Popover).
  + Chế độ Multi-label (Tag selector).
  + Chế độ Number / Regression (Input number trực tiếp).
- Tích hợp phím tắt số (1-9) và cơ chế tự động chuyển dòng (auto-advance).
- Đồng bộ dữ liệu vào `workingResults` của workspace.

Phase 3: Bulk Actions, Search & Filtering
- Checkbox chọn nhiều dòng (hỗ trợ Shift+Click).
- Floating Action Bar gán nhãn hàng loạt cho các dòng đã chọn.
- Toolbar tìm kiếm và lọc dòng: Đã gán / Chưa gán nhãn.
- Tính năng ẩn/hiện cột.

Phase 4: Persistence, Validation & Acceptance Gate
- Hoàn thiện luồng Save & Revision history diff.
- Xử lý các edge cases (mất mạng, dữ liệu null, file lớn).
- Chạy kiểm tra quy chuẩn chấp thuận: Prettier, ESLint, Typecheck, Build, Responsive tại 390px và 1440px.
```

---

## Phản Hồi 3 Câu Hỏi Trọng Tâm

### Q1: Tabular labeling nên được tích hợp vào flow annotation hiện tại như thế nào?
> Giữ nguyên 100% flow điều hướng hiện tại của Platform:
> `Project Detail` $\rightarrow$ `Dataset Version` $\rightarrow$ `AssetDetailModal` (hoặc click nút Gán nhãn trên bảng Asset) $\rightarrow$ `/projects/[id]/annotate/[assetId]`.
> Tại đây, `AnnotationEditorDispatcher` dựa vào `effectiveInputType === "tabular"` sẽ tự động nạp `TabularEditor` mới vào vùng Canvas chính. Annotator hoàn thành gán nhãn cho file bảng đó, nhấn `Ctrl+S` lưu Revision, rồi bấm `]` để chuyển sang file tiếp theo trong dataset.

### Q2: Những component nào nên reuse và component nào thực sự cần tạo mới?
> * **Reuse (Tái sử dụng hiện có):**
>   * `AnnotationWorkspaceView` (khung tổng thể).
>   * `WorkspaceHeader` (thanh điều hướng, asset stepper, save button).
>   * `WorkspaceCategoryBar` (bảng nhãn 1-9 và phím tắt).
>   * `WorkspaceSidebar` (lịch sử revision diff).
>   * Các UI primitives: `Button`, `Badge`, `Input`, `Dialog`, `ConfirmDialog`, `EmptyState`.
> * **Tạo mới / Viết lại:**
>   * Refactor toàn diện `TableAnnotationCanvas`: Tách nhỏ thành `TabularToolbar`, `TabularDataGrid`, `TabularLabelCell`, `TabularBulkActionBar`, `TabularPagination`. Không cần cài thêm thư viện nặng nếu tự build Grid sạch trên Tailwind CSS và React Memoization.

### Q3: Có vấn đề architectural / backend nào cần giải quyết trước khi bắt đầu implement UI không?
> 1. **Khóa chính của dòng dữ liệu:** Cần thống nhất quy ước cột khóa chính trong file bảng. Nếu file tải lên không có cột `id`/`uuid`, frontend sẽ tự động hash dòng để sinh `__row_id__` tạm thời nhằm đảm bảo tính bất biến của nhãn theo đúng quy tắc kiến trúc.
> 2. **Kích thước payload của Revision:** Trong giai đoạn này, lưu danh sách kết quả của các dòng vào mảng `results` trong 1 `AnnotationRevision` duy nhất của Asset. Backend đã hỗ trợ sẵn việc này (`results: JSONB`), không cần sửa đổi database migration hay router backend trước khi làm UI.
