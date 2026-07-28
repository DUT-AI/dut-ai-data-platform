# Phase 3 — Snapshot + Export Domain

> **Thời gian**: 5 tuần · **Team**: 5 devs  
> **Phụ thuộc**: Phase 2 (Annotation + Workflow)  
> **Mục tiêu**: Đóng băng dữ liệu đã annotate thành Snapshot bất biến, export ra các format phổ biến (COCO, YOLO, VOC...) để dùng cho training.

---

## 3A — Snapshot Domain (Tuần 1–2.5)

### Database Tables

| Table | Columns chính | Ghi chú |
|-------|---------------|---------|
| `snapshots` | id, project_id, dataset_version_id, ontology_version_id, version, status, created_by, created_at | Immutable sau khi created. status: creating/ready/failed |
| `snapshot_items` | id, snapshot_id, asset_id, annotation_revision_id, split, checksum | split: train/validation/test. UNIQUE(snapshot_id, asset_id) |
| `snapshot_manifests` | snapshot_id, asset_count, annotation_count, split_distribution (JSONB), metadata (JSONB) | 1-1 với snapshot |

### API Endpoints

| Method | Path | Mô tả | Quyền |
|--------|------|--------|-------|
| `POST` | `/api/v1/projects/{pid}/snapshots` | Tạo snapshot | Owner/Admin |
| `GET` | `/api/v1/projects/{pid}/snapshots` | List snapshots | Member |
| `GET` | `/api/v1/snapshots/{id}` | Chi tiết snapshot + manifest | Member |
| `GET` | `/api/v1/snapshots/{id}/items` | List items trong snapshot (paginated) | Member |
| `GET` | `/api/v1/snapshots/{id}/diff` | So sánh với snapshot khác | Member |

### Cần làm

- **Snapshot Builder Service**: thu thập Dataset Version + tất cả Annotation Revisions + Ontology Version → tạo Snapshot Items → generate Manifest
  - Với mỗi Asset trong Dataset Version: lấy latest approved Annotation Revision (hoặc cho phép user chọn)
  - Assets chưa có annotation: có thể include với `annotation_revision_id = null` hoặc exclude (config theo project)
- **Split Assignment**: phân chia Train/Validation/Test
  - Chiến lược: random (với seed), stratified (theo category distribution), manual (user tự chỉ định)
  - Lưu split vào từng snapshot_item
- **Snapshot Validator**: trước khi finalize → kiểm tra tất cả references hợp lệ, không có orphan, asset unique
- **Immutability**: Snapshot không được cập nhật sau khi created. Mọi thay đổi → tạo snapshot mới
- **Snapshot Diff Service**: so sánh 2 snapshots → added assets, removed assets, changed annotations
- **Async creation**: tạo snapshot cho dataset lớn chạy async qua Celery → polling status

### Frontend

- Trang snapshot list: version, created_by, asset_count, split distribution
- Tạo snapshot: chọn dataset version, ontology version, split strategy, split ratio
- Snapshot detail: manifest stats, split distribution chart (pie/bar), item list
- Diff viewer: 2 snapshots side-by-side, highlight changes

---

## 3B — Export Domain (Tuần 3–5)

### Database Tables

| Table | Columns chính | Ghi chú |
|-------|---------------|---------|
| `export_jobs` | id, project_id, snapshot_id, format, config (JSONB), status, created_by, created_at, started_at, completed_at | status: pending/running/completed/failed/cancelled |
| `export_packages` | id, export_job_id, uri, checksum, file_size, metadata (JSONB), expires_at | URI trỏ tới MinIO. expires_at cho presigned URL |
| `export_items` | id, export_package_id, source_asset_id, source_annotation_revision_id, target_path, metadata (JSONB) | Mỗi item = 1 data point trong package |

### API Endpoints

| Method | Path | Mô tả | Quyền |
|--------|------|--------|-------|
| `POST` | `/api/v1/export-jobs` | Tạo export job | Owner/Admin |
| `GET` | `/api/v1/projects/{pid}/export-jobs` | List export jobs | Member |
| `GET` | `/api/v1/export-jobs/{id}` | Chi tiết + status | Member |
| `DELETE` | `/api/v1/export-jobs/{id}` | Cancel job đang chạy | Owner/Admin |
| `GET` | `/api/v1/export-packages/{id}/download` | Presigned URL download | Member |

### Cần làm

- **Format Adapter Interface**: abstract exporter — `transform(snapshot_items, config) → files`
- **Adapters cần implement** (theo thứ tự ưu tiên):
  1. **COCO JSON**: Detection, Segmentation — images.json, annotations.json, categories.json
  2. **YOLO TXT**: Detection — mỗi image 1 file txt, labels.txt
  3. **Pascal VOC XML**: Detection — mỗi image 1 file XML
  4. **CSV**: Generic tabular export (asset_path, category, bbox coords...)
  5. **JSON**: Custom flat export toàn bộ annotation data
- **Export Builder**: nhận snapshot_id + format + config → tạo ExportJob → dispatch Celery task
- **Package Composer**: gom các file export → zip → upload lên MinIO
- **Manifest Generator**: sinh file `manifest.json` mô tả nội dung package (file list, checksum, stats)
- **Async Execution**: export chạy qua Celery, cập nhật status realtime (pending → running → completed)
- **Presigned Download**: sau khi completed → generate presigned URL có expiry
- **Retry logic**: export failed có thể retry

### Format Config Examples

| Format | Config options |
|--------|----------------|
| COCO | include_splits (true/false), split_to_export (train/val/test/all), annotation_types ([bbox, segmentation]) |
| YOLO | include_images (true/false), class_mapping (category_name → class_id) |
| VOC | include_difficult flag, folder structure |
| CSV | columns to include, delimiter |

### Frontend

- Trang export jobs: list, create button, status badges
- Create export modal: chọn snapshot, format, config options (per format)
- Export job detail: status, progress bar (khi running), log output
- Download button sau khi completed (hiển thị file size)
- Export history per snapshot

---

## Phân công (5 tuần × 5 devs)

| Tuần | Dev 1 | Dev 2 | Dev 3 | Dev 4 | Dev 5 (Frontend) |
|------|-------|-------|-------|-------|-------------------|
| **1** | Snapshot model + repo | Snapshot Builder core | Split assignment strategies | Snapshot Validator | Snapshot list + create UI |
| **2** | Async snapshot creation (Celery) | Snapshot Diff Service | Snapshot API router + tests | Snapshot Manifest generator | Snapshot detail + diff viewer |
| **3** | Export model + repo | Format Adapter interface | COCO + YOLO adapters | Export Builder + Celery task | Export jobs UI |
| **4** | VOC + CSV + JSON adapters | Package Composer + MinIO | Presigned download + expiry | Export API router + tests | Create export modal + config |
| **5** | Integration tests (Snapshot → Export) | Retry logic + error handling | Performance test (large dataset) | API review + fixes | Export status polling + download |

---

## Acceptance Criteria

### Snapshot
- [ ] Tạo Snapshot từ Dataset Version + Annotation Revisions + Ontology Version
- [ ] Snapshot immutable: không thể thay đổi sau khi created
- [ ] Asset unique trong snapshot (không trùng)
- [ ] Split distribution đúng với config (ratio train/val/test)
- [ ] Manifest hiển thị đúng stats (asset_count, annotation_count, split_distribution)
- [ ] Snapshot Diff hiển thị changes giữa 2 versions
- [ ] Async creation: status polling hoạt động

### Export
- [ ] Export COCO → format valid (validate với pycocotools)
- [ ] Export YOLO → format valid
- [ ] Export VOC → XML valid
- [ ] Export CSV/JSON → hoạt động
- [ ] Package được nén zip + upload MinIO
- [ ] Presigned URL download hoạt động
- [ ] Failed export có thể retry
- [ ] Export chỉ đọc từ Snapshot, không đọc live data
