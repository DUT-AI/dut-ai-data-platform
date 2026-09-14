# Ontology Domain

Ontology định nghĩa schema ngữ nghĩa (semantic schema) cho dữ liệu và tác vụ gán nhãn trong một Project. Module này sở hữu danh mục định nghĩa đầu vào/đầu ra chuẩn (Input/Output Definitions), các nút thành phần (Inputs, Outputs, Categories) thuộc Ontology, và vòng đời đóng băng phiên bản ghép nối (Ontology Version Composition & Publishing). Module không sở hữu Project, Dataset, Asset hay kết quả Annotation cụ thể.

## Domain model và quy tắc

- **Quan hệ 1 - 1 giữa Project và Ontology**:
  - Mỗi `Project` chỉ sở hữu duy nhất một `Ontology` chính thức (`ontologies.project_id` có ràng buộc `UNIQUE`).
  - Khi Project được tạo, hệ thống tự động khởi tạo Ontology và phiên bản Version 1 (`draft`).
  - Không cho phép tạo nhiều hơn một Ontology trong cùng một Project.
- `Ontology` quản lý danh sách các node tái sử dụng (`OntologyInput`, `OntologyOutput`, `Category`).
- `OntologyVersion` là đơn vị đóng băng schema tuyến tính (Linear Versioning):
  - Một Ontology tại một thời điểm chỉ có tối đa một bản `draft`.
  - Phiên bản mới có thể tạo trống hoặc clone từ một phiên bản đã `published` (`based_on_version_id`).
  - Khi ở trạng thái `draft`, phiên bản được tự do cấu hình dây nối (`composition`: liên kết Inputs, Outputs gắn với Input nguồn, và Categories gán cho Output).
  - Khi gọi `publish`, version được kiểm tra toàn vẹn (`validate_version`), chuyển sang `published` (bất biến - immutable), tự động sinh mã băm cấu trúc `schema_hash` (SHA-256) và cập nhật thành `current_version_id` của Ontology.
- **Quy tắc Node Lock**:
  - Bất kỳ `OntologyInput`, `OntologyOutput`, hoặc `Category` nào đã tham gia vào ít nhất một `published` Version sẽ bị khóa (`locked = True`), không được phép chỉnh sửa nội dung hay xóa bỏ. Để thay đổi ngữ nghĩa, người dùng tạo node mới cho bản draft kế tiếp.
- **Ràng buộc Composition & Validation**:
  - Một version hợp lệ phải có ít nhất một Input và một Output.
  - Mọi Output phải gắn với một Input nguồn nằm trong cùng version đó.
  - Output loại phân loại/nhãn (`supports_categories = True`) bắt buộc phải có ít nhất một Category.
  - Output không hỗ trợ nhãn (`supports_categories = False`) không được chứa Category.
  - `custom_object` bắt buộc phải có `value_schema`.

## Database

Module sở hữu các bảng danh mục catalog toàn hệ thống và các bảng cấu trúc Ontology:
- Danh mục hệ thống: `input_definitions`, `output_definitions`.
- Cấu trúc Ontology: `ontologies` (với ràng buộc `uq_ontologies_project_id`), `ontology_inputs`, `ontology_outputs`, `categories`.
- Quản lý phiên bản & ghép nối: `ontology_versions`, `ontology_version_inputs`, `ontology_version_outputs`, `ontology_version_output_categories`.

Migrations: `009_ontology_module_schema`, `012_unique_project_ontology`.

Danh mục hạt nhân được seed mặc định gồm 7 Input Definitions (`image`, `tabular`, `video`, `audio`, `document`, `object`, `link`) và 8 Output Definitions (`classification`, `bounding_box`, `polygon`, `text`, `named_entity`, `relation`, `number`, `custom_object`).

## API

- Danh mục toàn cục: `/api/v1/ontology-definitions/inputs`, `/api/v1/ontology-definitions/outputs`.
- **Ontology duy nhất của Project**:
  - Truy xuất trực tiếp: `GET /api/v1/projects/{project_id}/ontology`.
  - Quản lý legacy/CRUD: `/api/v1/projects/{project_id}/ontologies`, `/{ontology_id}`.
- Thành phần cấu tử (Nodes):
  - Inputs: `/api/v1/projects/{project_id}/ontologies/{ontology_id}/inputs` (CRUD).
  - Outputs: `/api/v1/projects/{project_id}/ontologies/{ontology_id}/outputs` (CRUD).
  - Categories: `/api/v1/projects/{project_id}/ontologies/{ontology_id}/categories` (CRUD).
- Phiên bản & Ghép nối (Versions & Composition):
  - Quản lý: `/api/v1/projects/{project_id}/ontologies/{ontology_id}/versions` (CRUD).
  - Ghép nối cấu trúc: `PUT /{version_id}/composition`.
  - Kiểm tra tính hợp lệ: `POST /{version_id}/validate`.
  - Công bố phiên bản: `POST /{version_id}/publish`.
  - Xuất schema: `GET /{version_id}/schema`.

## Integration contracts

- `OntologyVersion.schema_hash` và endpoint export schema (`GET /{version_id}/schema`) là contract chính thức với Annotation Domain và Export Engine:
  - **Annotation Domain**: Dynamic Schema Validation dựa trên cấu trúc output definitions và categories của published version để kiểm tra tính hợp lệ của `results` payload và `category_ids`.
  - **Dataset Domain / Export Engine**: Đọc schema snapshot bất biến để map dữ liệu chuẩn hóa sang các format đầu ra (COCO, YOLO, Pascal VOC, CSV/JSONL...).
- Quyền truy cập: Yêu cầu role thành viên project tương ứng (`require_ontology_read`, `require_ontology_write`). Thao tác sửa đổi danh mục định nghĩa toàn cục yêu cầu quyền quản trị catalog (`require_ontology_catalog_write`).
