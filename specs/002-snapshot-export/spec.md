# Feature Specification: Snapshot-Driven Data Export

**Feature Branch**: `002-snapshot-export`  
**Created**: 2026-11-11  
**Status**: Draft  
**Input**: User description: "Xây dựng module Export Domain theo nguyên tắc Snapshot-driven Export (không sử dụng Export Job): export trực tiếp từ Snapshot hợp lệ, chuyển đổi dữ liệu sang các định dạng đích, đóng gói thành Export Package bất biến kèm Export Item để truy vết, lưu metadata phục vụ kiểm toán, tải lại, huấn luyện và tích hợp hệ thống bên ngoài."

---

## Clarifications

### Session 2026-11-12

- Q: Khi export lại cùng một Snapshot với cùng Export Format, Output mục tiêu và chế độ đóng gói media, hệ thống tái sử dụng Export Package cũ hay tạo gói mới? → A: Tái sử dụng (idempotent): trả về `Export Package` bất biến đã tồn tại cho tổ hợp (`Snapshot` + `Export Format` + `Target Output` + chế độ media) thay vì tạo gói mới.
- Q: Những vai trò thành viên nào trong dự án được phép tạo mới và tải xuống Export Package? → A: Chỉ `Owner` và `Admin` của dự án được phép tạo, xem lịch sử/chi tiết và tải `Export Package` (chặn `Reviewer` và `Annotator`).
- Q: Khi Snapshot có các asset chưa được gán nhãn cho Output mục tiêu, hệ thống xử lý thế nào khi export? → A: Mặc định bao gồm tất cả asset trong `Snapshot` (xuất nhãn rỗng theo chuẩn định dạng đích), và cho phép người dùng bật tùy chọn "Chỉ xuất asset đã có nhãn" khi thực hiện export.
- Q: Vì hệ thống không duy trì thực thể Export Job mà tạo trực tiếp Export Package, hệ thống áp dụng giới hạn quy mô thế nào khi người dùng chọn Full Bundle (tải cả media)? → A: Áp dụng ngưỡng quy mô có thể cấu hình (mặc định tối đa 2 GB hoặc 5.000 tệp media); yêu cầu Full Bundle vượt ngưỡng này sẽ bị từ chối ngay trước khi xử lý kèm thông báo hướng dẫn xuất ở chế độ Chỉ nhãn + Manifest để đảm bảo hiệu năng và tính ổn định.
- Q: Khi Snapshot có chứa thông tin phân chia tập dữ liệu (như train, val, test), hệ thống tổ chức cấu trúc tệp xuất ra theo các split này như thế nào đối với các định dạng như YOLO hay COCO? → A: Tự động phân tách cấu trúc tệp/thư mục theo split (ví dụ: `labels/train/`, `labels/val/` trong YOLO; hoặc `instances_train.json`, `instances_val.json` trong COCO) nếu Snapshot có định nghĩa split; nếu Snapshot không có thông tin split thì gom toàn bộ dữ liệu vào phân vùng mặc định (như `train` hoặc thư mục gốc).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Export a Snapshot into an Immutable Export Package (Priority: P1)

As an ML Engineer or Data Manager, I want to export a valid, finalized `Snapshot` directly into a compatible target format so that I can obtain a standardized, reproducible `Export Package` ready for model training, evaluation, or sharing.

**Why this priority**: Generating a reproducible `Export Package` directly from an immutable `Snapshot` is the primary business goal of the Export capability. Without this flow, downstream training pipelines and external tools cannot consume platform data in a unified way.

**Independent Test**: Can be fully tested by triggering an export on a pre-existing valid `Snapshot` using a supported target format and verifying that the resulting `Export Package` is created, passes target-format validation, and contains the exact data frozen in the `Snapshot` with a manifest and integrity checksum.

**Acceptance Scenarios**:

1. **Given** a valid, ready `Snapshot`, **When** a user triggers an export in a compatible target format, **Then** the system transforms the Snapshot data, validates the transformed output against the target format rules, and produces a downloadable, immutable `Export Package`.
2. **Given** an `Export Package` is being generated or has been generated from a `Snapshot`, **When** live dataset items or live annotations in the project are modified afterward, **Then** the exported `Export Package` still reflects strictly the frozen contents of the `Snapshot` without any contamination from live changes.
3. **Given** an error occurs during transformation or packaging, **When** the failure occurs, **Then** the system rejects the export with an actionable error reason and does not persist or expose an incomplete or corrupted `Export Package`.

---

### User Story 2 - Traceability, Audit, and Re-download of Export Packages (Priority: P2)

As a Data Auditor, Team Lead, or ML Engineer, I want to inspect previously generated Export Packages, verify package integrity, trace every exported item back to its source asset and annotation revision, and re-download an existing `Export Package` without re-running the transformation.

**Why this priority**: AI datasets require strict lineage and auditability. Teams must be able to prove exactly which frozen assets and annotation revisions were used in a training run and retrieve the exact same package repeatedly without generating duplicate work.

**Independent Test**: Can be tested by completing an export, querying stored package details and `Export Item` records, verifying each `Export Item` references its `source asset`, `source annotation revision`, and `target path`, and re-downloading the stored `Export Package` with the same integrity checksum.

**Acceptance Scenarios**:

1. **Given** a completed `Export Package`, **When** an authorized user inspects its metadata and lineage records, **Then** every `Export Item` displays its `target path` inside the package alongside its `source asset` and `source annotation revision` from the `Snapshot`.
2. **Given** a previously created `Export Package`, **When** a user or downstream system requests a re-download at a later time, **Then** the system returns the existing immutable `Export Package` and its integrity checksum without re-transforming the `Snapshot`.
3. **Given** multiple `Export Package`s created over time from the same or different `Snapshot`s, **When** a user reviews available packages, **Then** the system lists all packages with their chosen formats, creation timestamps, checksums, and source Snapshot references.

---

### User Story 3 - Multi-Format Compatibility and Downstream Consumption (Priority: P3)

As an ML Engineer or Downstream System Operator, I want to see which target export formats are compatible with a given `Snapshot`, export the same `Snapshot` into multiple formats independently, and allow training pipelines or external tools to consume the resulting packages cleanly.

**Why this priority**: Because the platform supports diverse AI tasks (vision, text, audio, video, tabular, chat), different tasks require different target formats. Compatibility checking and isolated format transformation rules keep exports reliable and easy to extend as new formats are added.

**Independent Test**: Can be tested by checking available formats for Snapshots representing different annotation types, verifying incompatible format requests are blocked upfront, exporting one Snapshot into two distinct formats, and verifying each package passes its target format validation.

**Acceptance Scenarios**:

1. **Given** a `Snapshot` containing a specific annotation structure (such as bounding boxes or text entity spans), **When** a user checks or requests an export format, **Then** only compatible target formats are offered and incompatible format requests are rejected immediately with a clear explanation.
2. **Given** a valid `Snapshot`, **When** a user exports it into format A and separately into format B, **Then** both exports succeed independently and yield two distinct immutable `Export Package`s tailored to each target schema.
3. **Given** a completed `Export Package`, **When** an internal training workflow or external tool consumes it, **Then** it can obtain the package manifest, integrity checksum, and package location directly from Export metadata without touching Dataset or Annotation records.

---

### Edge Cases

- **Missing or Unready Snapshot**: Attempting to export from a non-existent, unfinalized, or invalid `Snapshot` must be rejected immediately before packaging begins.
- **Incompatible Target Format**: Requesting an export format that cannot represent the `Snapshot`'s annotation types or input modality (e.g., requesting an object-detection spatial format for a text classification Snapshot) must fail validation upfront with clear guidance.
- **Snapshot with Unannotated or Empty Items**: Exporting a `Snapshot` with zero items (or zero annotated items when the annotated-only option is enabled) must handle empty outputs gracefully according to target format rules or reject clearly if the target format forbids empty datasets; under default inclusion, unannotated Snapshot assets emit format-compliant empty label entries, and when excluded via the annotated-only filter, excluded counts are recorded in the package manifest.
- **Missing Required Source Metadata**: If a target format requires source metadata (such as image dimensions for coordinate conversion or media duration), missing metadata in the `Snapshot` must cause a clear validation failure rather than silently emitting corrupted coordinates.
- **Snapshot Lacking Split Metadata**: If a Snapshot contains no train/val/test split information, format exporters that typically expect splits (such as YOLO or COCO) must automatically fall back to placing all assets and labels into a default partition (e.g. `train` or root) rather than failing export or producing invalid configurations.
- **Concurrent Export Requests**: Multiple users simultaneously exporting the same `Snapshot` into different formats, media modes, or filter options must create isolated `Export Package`s without overwriting or corrupting each other; concurrent identical requests for the same (`Snapshot` + `Export Format` + target Output + media mode + annotated-only option) must resolve idempotently to a single immutable `Export Package` without duplicates or partial writes.
- **Interrupted Packaging or Storage Failure**: If an error occurs while writing or storing a package, no partial or corrupted `Export Package` record or file may be published for download.
- **Oversized or Missing Media Asset in Full-Bundle Mode**: When full-bundle mode is selected, if the Snapshot exceeds the configured full-bundle threshold (default 2 GB or 5,000 media files), the system must reject the export request upfront before packaging begins with actionable guidance recommending labels-only mode; if any referenced source media asset is inaccessible or missing during packaging, the export must fail cleanly without producing a partial or corrupted archive.
- **Unauthorized Role Access**: Project members without `Owner` or `Admin` roles (such as `Reviewer` or `Annotator`) attempting to create, inspect, or download an `Export Package` must be denied access immediately.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Snapshot-Only Data Source)**: The system MUST read export source data and generate `Export Package`s exclusively from an existing, valid, immutable `Snapshot`; it MUST NEVER read directly from mutable Datasets or live Annotations.
- **FR-002 (Direct Idempotent Snapshot-to-Package Export & History)**: The system MUST allow authorized users to export a valid `Snapshot` directly into an immutable `Export Package` (without maintaining a separate `Export Job` entity or job lifecycle state machine) and retain `Export Package` metadata history. Re-exporting the exact same (`Snapshot`, `Export Format`, target Output, media inclusion mode, annotated-only option) combination MUST be idempotent and return the existing immutable `Export Package` rather than creating duplicate packages.
- **FR-003 (Target Format Transformation & Validation)**: The system MUST transform `Snapshot` data into the requested target format schema and validate that the transformed output satisfies target format requirements before finalizing the `Export Package`.
- **FR-004 (Extensible Format Isolation)**: Format-specific transformation rules MUST be isolated per target format so that adding a new export format does not alter core export orchestration or break existing export formats.
- **FR-005 (Initial Supported Target Formats & Compatibility Filtering)**: In v1, the system MUST support Canonical JSON/JSONL (all task types), COCO and YOLO (Computer Vision tasks), and CSV (Classification, Tabular, and Text tasks), with architecture supporting future additions (such as Pascal VOC, Hugging Face Dataset, and CoNLL) as isolated format extensions. The system MUST filter available formats to only those compatible with the Snapshot; when a Snapshot contains multiple Outputs, the system MUST allow exporting full multi-output data via Canonical JSON/JSONL or selecting a specific compatible target Output for task-specific formats.
- **FR-006 (Immutable Export Package & Manifest)**: Each completed export MUST produce an immutable `Export Package` stored in platform storage, accompanied by a generated manifest describing package contents, metadata, and a verifiable integrity checksum.
- **FR-007 (Media Asset Inclusion Policy & Scale Limits)**: When composing an `Export Package`, the system MUST default to exporting transformed labels and a manifest referencing the source `Snapshot` assets (without copying raw media files), AND MUST allow users to explicitly select an optional full-bundle mode that packages source media files alongside the transformed labels in a self-contained downloadable bundle (without duplicating raw Snapshot records in internal Export metadata). To prevent system exhaustion in direct export execution, full-bundle mode MUST enforce a configurable safety threshold (defaulting to 2 GB total media size or 5,000 files); requests exceeding this threshold MUST be rejected upfront with actionable guidance directing the user to export in labels-only mode.
- **FR-008 (Item-Level Traceability)**: The system MUST record `Export Item` entries inside each `Export Package` linking each exported `target path` and metadata back to the `source asset` and `source annotation revision` in the `Snapshot`.
- **FR-009 (Retrievability & Re-download)**: The system MUST preserve Export Package metadata and generated packages so authorized users, training workflows, and external systems can retrieve package details, verify checksums, and re-download completed packages without re-executing transformation.
- **FR-010 (Strict Domain Responsibility Boundaries)**: Export Domain MUST NOT manage Datasets, Annotations, Snapshots, annotation workflows, Export Jobs, Training Jobs, or Models, and MUST NOT execute annotation labeling or upstream annotation validation logic.
- **FR-011 (Upstream Snapshot Dependency)**: The system MUST strictly depend on an upstream `Snapshot` module and accept only finalized, immutable `Snapshot` instances produced by that module as the sole data source for exports (no interim bypass to live or un-snapshotted Datasets).
- **FR-012 (Role-Based Export Authorization)**: Only project members holding the `Owner` or `Admin` role for the `Snapshot`'s parent project MUST be authorized to trigger exports, view `Export Package` metadata/lineage, and download `Export Package`s; `Reviewer` and `Annotator` roles MUST be denied export access.
- **FR-013 (Unannotated Asset Inclusion Option)**: By default, the system MUST include all assets from the `Snapshot` (emitting format-compliant empty annotations for unannotated assets), AND MUST allow users to opt into an annotated-only filter that excludes unannotated assets while recording the excluded asset count in the `Export Package` manifest.
- **FR-014 (Dataset Split Structure Mapping)**: When exporting formats that support split organization (such as YOLO, COCO, or CSV), the system MUST inspect the Snapshot metadata for split definitions (`train`, `val`, `test`): if split definitions are present, the system MUST automatically organize exported files and directories accordingly (e.g., `labels/train/` and `labels/val/` in YOLO; `instances_train.json` and `instances_val.json` in COCO; or split column/files in CSV); if the Snapshot contains no split information, the system MUST export the entire dataset into a single default partition (e.g. `train` or root) without error.

### Key Entities *(include if feature involves data)*

- **Export Package**: Represents the immutable, reusable output artifact uniquely identified per (`Snapshot`, `Export Format`, target Output, media inclusion mode, annotated-only option) combination (whether a compressed bundle, storage directory, manifest, or multi-file package), storing its reference to the source `Snapshot`, target format, storage location, generated manifest, integrity checksum, and metadata for audit and re-download.
- **Export Item**: Represents an individual entry within an `Export Package` (such as an image-and-annotation pair, a tabular row, or a formatted record file), storing its `target path`, item metadata, and lineage links to the `source asset` and `source annotation revision` in the `Snapshot`.
- **Export Format**: Represents a supported output format definition (such as Canonical JSON/JSONL, COCO, YOLO, CSV, or future extensible formats) including its compatibility rules against `Snapshot` data types and annotations.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (100% Snapshot Consistency)**: 100% of `Export Package`s generated from the same `Snapshot` and format remain identical in exported label content even if live Datasets or live Annotations in the project change after the `Snapshot` was taken.
- **SC-002 (100% Lineage Traceability)**: 100% of `Export Item` records in completed `Export Package`s resolve unambiguously to a valid `source asset`, `source annotation revision`, and `target path`.
- **SC-003 (Zero Corrupt Package Releases)**: 100% of completed `Export Package`s pass format structural validation and integrity checksum generation before release; failed exports result in 0 downloadable partial packages.
- **SC-004 (Re-download Reliability)**: 100% of completed `Export Package`s remain retrievable and downloadable again via their stored metadata and checksum without re-running the export transformation.
- **SC-005 (Format Extensibility)**: Adding support for a new target export format requires zero modifications to existing export formats and causes 0 regressions in previously supported formats.
- **SC-006 (Workflow Efficiency)**: Authorized users can configure and trigger an export from an eligible `Snapshot` in at most 3 actions using the default labels-only mode (select Snapshot, select compatible format, confirm export), or 4 actions when toggling full media bundling.
- **SC-007 (Full-Bundle Scale Protection)**: 100% of full-bundle export requests that exceed the configured threshold (default 2 GB or 5,000 media files) are rejected upfront with actionable guidance before any compression or file bundling begins.
- **SC-008 (Split Mapping Accuracy)**: 100% of exported packages from Snapshots containing split metadata preserve asset-to-split assignments in target format directories or split annotations; 100% of Snapshots without split metadata successfully export to the default partition without failure.

---

## Assumptions

- **Upstream Snapshot Readiness**: An upstream `Snapshot` capability exists (or is delivered separately by the Snapshot owner) that freezes both asset membership and exact annotation revisions along with ontology definitions before export is invoked.
- **Direct Package Creation Scope**: Because `Export Job` management is excluded by design, generating an `Export Package` operates directly from a `Snapshot` to an `Export Package` without introducing a separate Export Job lifecycle entity.
- **Upstream Annotation Validity**: Annotations captured in a valid `Snapshot` have already passed annotation schema validation prior to Snapshot creation; Export validation focuses strictly on target format schema conformance.
- **Authorization Inheritance**: Permission to trigger exports, view export package metadata, and download `Export Package`s is scoped strictly to `Owner` and `Admin` roles on the `Snapshot`'s parent project.
- **Out-of-Scope Future Extensions**: Incremental export, differential export between two Snapshots, streaming export for ultra-large datasets, direct export to external user-owned storage destinations, custom field template mapping, and multi-version export management for the same Snapshot are deferred to future iterations.
