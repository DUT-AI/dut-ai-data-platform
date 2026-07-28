# Phase 1 — Project + Ontology + Dataset Domain

> **Thời gian**: 6 tuần · **Team**: 5 devs  
> **Phụ thuộc**: Phase 0  
> **Mục tiêu**: User có thể tạo Project, định nghĩa Ontology (annotation schema), upload dữ liệu và quản lý Dataset Version.

---

## 1A — Project Domain (Tuần 1–2)

### Database Tables

| Table | Columns chính | Ghi chú |
|-------|---------------|---------|
| `projects` | id, name, description, project_type, owner_id, status, created_at, updated_at | project_type: detection, ocr, nlp, classification... |
| `project_members` | id, project_id, user_id, role, status, joined_at | role: owner/admin/annotator/reviewer. UNIQUE(project_id, user_id) |
| `project_configurations` | id, project_id, settings (JSONB), created_at, updated_at | 1-1 với project |

### API Endpoints

| Method | Path | Mô tả | Quyền |
|--------|------|--------|-------|
| `POST` | `/api/v1/projects` | Tạo project | Authenticated |
| `GET` | `/api/v1/projects` | List projects (của user) | Authenticated |
| `GET` | `/api/v1/projects/{id}` | Chi tiết project | Member |
| `PUT` | `/api/v1/projects/{id}` | Cập nhật project | Owner/Admin |
| `DELETE` | `/api/v1/projects/{id}` | Archive project | Owner |
| `POST` | `/api/v1/projects/{id}/members` | Thêm member | Owner/Admin |
| `GET` | `/api/v1/projects/{id}/members` | List members | Member |
| `PUT` | `/api/v1/projects/{id}/members/{mid}` | Đổi role | Owner/Admin |
| `DELETE` | `/api/v1/projects/{id}/members/{mid}` | Remove member | Owner/Admin |
| `GET` | `/api/v1/projects/{id}/config` | Lấy config | Member |
| `PUT` | `/api/v1/projects/{id}/config` | Cập nhật config | Owner/Admin |

### Cần làm

- Domain model: Project (Aggregate Root), ProjectMember, ProjectConfiguration
- Project Service: CRUD, lifecycle (active → archived)
- Member Management Service: add/remove member, change role
- Authorization middleware: `require_role("owner", "admin")` — check project membership + role
- Khi tạo Project → user hiện tại auto trở thành Owner
- `GET /projects` chỉ trả về projects mà user là member

### Frontend

- Trang danh sách projects (search, create button)
- Modal tạo project
- Trang project detail (tabs: Overview, Members, Settings)
- UI quản lý member (invite, change role, remove)

---

## 1B — Ontology Domain (Tuần 3–4)

### Database Tables

| Table | Columns chính | Ghi chú |
|-------|---------------|---------|
| `ontologies` | id, project_id, name, description, status, created_at | Thuộc 1 project |
| `ontology_versions` | id, ontology_id, version, status, created_at, published_at | status: draft/published/archived. UNIQUE(ontology_id, version) |
| `categories` | id, ontology_version_id, name, display_name, description, color, parent_category_id, sort_order | UNIQUE(version_id, name). Hỗ trợ hierarchical |
| `attributes` | id, category_id, name, display_name, type, required, default_value, allowed_values (JSONB), description | type: string/number/boolean/enum/list. UNIQUE(category_id, name) |

### API Endpoints

| Method | Path | Mô tả | Quyền |
|--------|------|--------|-------|
| `POST` | `/api/v1/projects/{pid}/ontologies` | Tạo ontology | Owner/Admin |
| `GET` | `/api/v1/projects/{pid}/ontologies` | List ontologies | Member |
| `POST` | `/api/v1/ontologies/{id}/versions` | Tạo draft version | Owner/Admin |
| `GET` | `/api/v1/ontology-versions/{vid}` | Chi tiết version + categories + attributes | Member |
| `PUT` | `/api/v1/ontology-versions/{vid}/publish` | Publish version | Owner/Admin |
| `POST` | `/api/v1/ontology-versions/{vid}/categories` | Thêm category | Owner/Admin |
| `PUT` | `/api/v1/categories/{cid}` | Sửa category | Owner/Admin |
| `DELETE` | `/api/v1/categories/{cid}` | Xóa category | Owner/Admin |
| `POST` | `/api/v1/categories/{cid}/attributes` | Thêm attribute | Owner/Admin |
| `PUT` | `/api/v1/attributes/{aid}` | Sửa attribute | Owner/Admin |
| `DELETE` | `/api/v1/attributes/{aid}` | Xóa attribute | Owner/Admin |

### Cần làm

- Domain model: Ontology, OntologyVersion, Category, Attribute
- Ontology Service: CRUD ontology, create/publish version
- Version lifecycle: Draft → Published (immutable). Chỉ Draft mới được sửa Category/Attribute
- Clone Version: tạo draft mới bằng cách deep copy từ published version (copy tất cả categories + attributes)
- Validation: category name unique trong version, attribute name unique trong category

### Frontend

- Ontology editor: tree view categories, form thêm/sửa category
- Attribute editor: thêm/sửa attribute cho từng category
- Version management: list versions, publish button, clone button
- Color picker cho category

---

## 1C — Dataset Domain (Tuần 5–6)

### Database Tables

| Table | Columns chính | Ghi chú |
|-------|---------------|---------|
| `datasets` | id, project_id, name, description, status, created_at | Thuộc 1 project |
| `dataset_versions` | id, dataset_id, version, status, asset_count, created_at, published_at | status: draft/published. UNIQUE(dataset_id, version) |
| `assets` | id, project_id, filename, uri, mime_type, file_size, sha256, metadata (JSONB), created_at | sha256 dùng để dedup. metadata: width, height, duration... |
| `dataset_version_assets` | id, dataset_version_id, asset_id, sort_order | UNIQUE(version_id, asset_id) |

### API Endpoints

| Method | Path | Mô tả | Quyền |
|--------|------|--------|-------|
| `POST` | `/api/v1/projects/{pid}/datasets` | Tạo dataset | Owner/Admin |
| `GET` | `/api/v1/projects/{pid}/datasets` | List datasets | Member |
| `GET` | `/api/v1/datasets/{id}` | Chi tiết dataset | Member |
| `POST` | `/api/v1/datasets/{id}/versions` | Tạo version mới | Owner/Admin |
| `GET` | `/api/v1/dataset-versions/{vid}` | Chi tiết version | Member |
| `GET` | `/api/v1/dataset-versions/{vid}/assets` | List assets trong version | Member |
| `POST` | `/api/v1/dataset-versions/{vid}/assets` | Upload files (multipart) | Owner/Admin |
| `DELETE` | `/api/v1/dataset-versions/{vid}/assets/{aid}` | Remove asset from version | Owner/Admin |
| `PUT` | `/api/v1/dataset-versions/{vid}/publish` | Publish version | Owner/Admin |
| `GET` | `/api/v1/assets/{id}` | Chi tiết asset | Member |
| `GET` | `/api/v1/assets/{id}/download` | Presigned URL download | Member |

### Cần làm

- Domain model: Dataset, DatasetVersion (immutable khi published), Asset
- Asset Import Service: upload file → MinIO → extract metadata → create/link Asset
- Asset Metadata Extractor: MIME type, kích thước ảnh, page count PDF...
- Duplicate Detection: tính SHA256 → check DB → nếu trùng thì reuse Asset thay vì upload lại
- Dataset Version Builder: tạo version, thêm/xóa assets, publish (lock)
- Storage path: `project-{project_id}/assets/{asset_id}/{filename}`
- Batch upload: hỗ trợ multi-file upload

### Frontend

- Trang dataset list, create modal
- Trang dataset version: asset gallery (grid view với thumbnail + list view)
- Upload dropzone: drag & drop multi-file, progress bar
- Asset detail: preview (image/PDF), metadata display
- Version management: tạo version, publish

---

## Phân công (6 tuần × 5 devs)

| Tuần | Dev 1 | Dev 2 | Dev 3 | Dev 4 | Dev 5 (Frontend) |
|------|-------|-------|-------|-------|-------------------|
| **1** | Project model + repo + service | ProjectMember service | ProjectConfig + auth middleware | Project API router + tests | Project list + create |
| **2** | Project integration tests | Member API + tests | Authorization (require_role) | API review + fixes | Project detail + members UI |
| **3** | Ontology model + service | Category + Attribute CRUD | Version lifecycle (draft→published) | Ontology API router | Ontology editor UI |
| **4** | Clone version flow | Validation rules | Ontology integration tests | API review + fixes | Ontology version mgmt UI |
| **5** | Dataset model + service | Asset model + SHA256 dedup | Asset upload + MinIO + metadata | Dataset API router | Dataset list + version UI |
| **6** | Batch upload | Dataset version builder | Dataset integration tests | API review + fixes | Asset gallery + upload dropzone |

---

## Acceptance Criteria

### Project
- [ ] CRUD Project hoạt động
- [ ] Thêm/xóa member, thay đổi role
- [ ] Authorization: Owner/Admin sửa, Member chỉ đọc
- [ ] `GET /projects` chỉ trả projects user là member

### Ontology
- [ ] Tạo Ontology → Draft Version → Add Categories + Attributes → Publish
- [ ] Published version không thể sửa (400)
- [ ] Clone version tạo draft mới từ published
- [ ] Category/Attribute unique constraints

### Dataset
- [ ] Upload files → Asset created + metadata extracted
- [ ] Duplicate: upload file trùng SHA256 → reuse Asset
- [ ] Published version không thể thêm/xóa assets
- [ ] Download via presigned URL
- [ ] Frontend hiển thị asset gallery
