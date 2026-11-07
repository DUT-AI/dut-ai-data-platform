# Feature Specification: Workflow Domain Management

**Feature Branch**: `002-workflow-domain`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "tôi thêm chức năng như mô tả của file này docs/Workflow Domain 3a898e2c5a1d80a48e64dd9858f04c00.md"

## Clarifications

### Session 2026-11-04
- Q: Hệ thống quản lý Workflow Definition nên theo cơ chế trạng thái linh hoạt (Dynamic JSON schema) hay bộ trạng thái cố định chuẩn (Standard Fixed Enum)? → A: Cố định hoàn toàn theo enum chuẩn (Created, Assigned, InProgress, Submitted, InReview, Approved, Rejected, Completed, Cancelled) để đơn giản và hoàn thiện nhanh quy trình cốt lõi Annotation -> Review -> Complete.
- Q: Khi Reviewer duyệt hoặc từ chối Work Item, hệ thống có cần lưu kèm nhận xét/lý do trong Workflow Domain không? → A: Reviewer có thể gửi nhận xét (comment) hoặc không khi review (Approved/Rejected), trường comment là tùy chọn (optional) và được lưu vào lịch sử chuyển trạng thái.
- Q: Phạm vi đối tượng nhận việc (Assignment) trong giai đoạn đầu nên ưu tiên mức độ nào? → A: Giao trực tiếp cho 1 User cụ thể (Primary Assignee) chịu trách nhiệm chính, trường team/role dùng làm metadata phụ trợ.
- Q: Hệ thống nên cho phép hủy (Cancelled) một Work Item ở những giai đoạn nào trong quy trình? → A: Cho phép hủy từ các trạng thái chưa hoàn tất (Created, Assigned, In Progress, Submitted, In Review, Rejected) nhưng nghiêm cấm hủy khi đã Approved hoặc Completed để bảo vệ tính toàn vẹn dữ liệu.
- Q: Cơ chế gửi thông báo (Notification) của Workflow Domain trong phiên bản đầu tiên (v1) nên được triển khai ở phạm vi nào? → A: Bỏ qua hoàn toàn Notification trong Workflow Domain v1 để tối ưu phạm vi triển khai và tập trung cốt lõi quản lý tiến độ.
- Q: Đơn vị công việc (Work Item) đại diện cho asset đơn lẻ hay cụm/lô asset (Batch)? → A: Work Item có thể đại diện cho một tài nguyên đơn lẻ HOẶC một lô/gói công việc (Batch/Group of Assets) gồm nhiều mục con, hỗ trợ cơ chế tự động chia cụm và phân bổ hàng loạt (Bulk/Batch Assignment) từ Dataset cho nhiều Annotator.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Workflow Definition, Batching & Work Item Initialization (Priority: P1)

As a Project Manager or System Administrator, I want to define customizable business process workflows and generate Work Items representing individual assets or batched asset groups (e.g., grouping 100 images into a single labeling task batch) from a Dataset, so that large datasets can be organized into manageable units of work independent of specific domain data.

**Why this priority**: Foundational core capability. Without workflow definitions, batching, and work items, no lifecycle state machine, assignment, or transition can be executed.

**Independent Test**: Can be tested by creating a Workflow Definition, generating a Work Item referencing a batch of 50 dataset assets (`resource_type="ANNOTATION_BATCH"`, `resource_id="batch_001"`), and verifying the initial `Created` state with its linked items.

**Acceptance Scenarios**:

1. **Given** a valid project, **When** a manager creates a Workflow Definition with steps and transition rules, **Then** the definition is saved and can be associated with project work.
2. **Given** an active Workflow Definition and a dataset of assets, **When** a manager defines a batch size (e.g., 50 assets per batch), **Then** the system groups assets and creates Work Items representing each batch in `Created` status.
3. **Given** an active Workflow Definition, **When** an event or manager initializes a job for a single resource, **Then** a Work Item is created with status `Created` and default priority.

---

### User Story 2 - Work Item Assignment, Bulk Distribution & State Progression (Priority: P1)

As a Project Lead or Worker (Annotator/Reviewer), I want Work Items to be distributed across annotators (individually or via bulk auto-distribution across multiple users) and transition across lifecycle states (Created -> Assigned -> In Progress -> Submitted -> In Review -> Approved/Rejected -> Completed) following strict state transition constraints, so that tasks progress predictably and without unauthorized state skips.

**Why this priority**: Represents the primary business loop of assigning work packages, completing tasks, and reviewing submissions.

**Independent Test**: Can be tested by selecting 10 Work Item batches and bulk-assigning them across 2 Annotators (5 each), transitioning a batch through `Assigned` -> `In Progress` -> `Submitted`, then having a Reviewer approve or reject it, verifying state constraints prevent invalid hops.

**Acceptance Scenarios**:

1. **Given** multiple unassigned Work Items, **When** a manager performs bulk distribution across a list of annotators, **Then** the items are evenly allocated, statuses become `Assigned`, and assignment records are persisted.
2. **Given** a Work Item in `Created` status, **When** a manager assigns it to User A with a due date, **Then** its status becomes `Assigned` and assignment details are recorded.
3. **Given** a Work Item in `Assigned` status, **When** the assignee starts work, **Then** the status transitions to `In Progress`.
4. **Given** a Work Item in `In Progress`, **When** the assignee submits work, **Then** status becomes `Submitted` and moves to `In Review`.
5. **Given** a Work Item in `In Review`, **When** the reviewer rejects it with feedback, **Then** the status reverts to `Assigned` for rework.
6. **Given** a Work Item in `In Review`, **When** the reviewer approves it, **Then** status transitions to `Approved` and subsequent `Completed`.
7. **Given** a Work Item in `Created` status, **When** an actor attempts to transition directly to `Completed`, **Then** the Transition Engine rejects the action with a validation error.

---

### User Story 3 - Comprehensive Audit Logging & Event Tracking (Priority: P2)

As a Compliance Officer, Auditor, or Project Lead, I want a tamper-evident audit history of all state changes, assignments, and actors involved in each Work Item, so that I can inspect the full lifecycle, detect bottlenecks, and meet compliance standards.

**Why this priority**: Essential for tracing responsibility, performance calculation, and debugging workflow issues, but dependent on stories 1 & 2.

**Independent Test**: Can be tested by running a Work Item through several transitions, querying the audit log for that Work Item, and verifying that every transition recorded `from_state`, `to_state`, `changed_by`, and `changed_at` timestamps accurately.

**Acceptance Scenarios**:

1. **Given** a Work Item undergoing status changes, **When** any state transition succeeds, **Then** an immutable entry is added to the workflow history containing prior state, target state, actor ID, and timestamp.
2. **Given** an existing Work Item, **When** an authorized user requests its audit log, **Then** a chronological list of all assignments and state transitions is returned.

---

### Edge Cases

- **Concurrent Transitions**: What happens when two reviewers attempt to approve/reject the same Work Item simultaneously? (System must lock the Work Item during transition and allow only the first valid request; the second must be rejected with a conflict error).
- **Deleted or Inactive Assignee**: What happens if an assigned user is deactivated before completing a task? (The Work Item must be flaggable as unassigned/reassignable back to `Assigned` or `Created`).
- **Resource Deletion / Detachment**: What happens if the underlying resource (e.g., dataset item or annotation) is deleted while a Work Item is active? (Work Item must transition to `Cancelled` with an audit note explaining resource unavailability).
- **Workflow Definition Mutation**: What happens to active Work Items when their Workflow Definition configuration is edited? (Existing Work Items must continue executing their original workflow version, or transitions must validate against compatibility rules).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide standard Workflow Definitions implementing standard lifecycle states (`Created`, `Assigned`, `InProgress`, `Submitted`, `InReview`, `Approved`, `Rejected`, `Completed`, `Cancelled`) for project work tracking.
- **FR-002**: System MUST decouple workflow management from specific domain data by representing units of work as `Work Item` entities with `resource_type` and `resource_id`, supporting both individual items and batched groups (`resource_type = "ANNOTATION_BATCH"`).
- **FR-003**: System MUST enforce a state machine with a centralized `Transition Engine` validating state transitions against strict standard transition rules (Created -> Assigned/Cancelled; Assigned -> InProgress; InProgress -> Submitted; Submitted -> InReview; InReview -> Approved/Rejected; Rejected -> Assigned; Approved -> Completed).
- **FR-004**: System MUST support assignment of Work Items directly to an individual user as the primary assignee, with optional metadata for team/role, tracking assignee, assigner, priority, and due date.
- **FR-005**: System MUST provide bulk assignment / auto-distribution capabilities to partition unassigned Work Items evenly or by quota across a selected list of annotators.
- **FR-006**: System MUST record an immutable `Audit Log` (`workflow_history`) for every state change, documenting previous state, next state, actor, timestamp, and optional comment/feedback.
- **FR-007**: System MUST allow reviewers to provide optional feedback comments during state transitions (`Approved` or `Rejected`), persisted into the audit log.
- **FR-008**: System MUST provide query capabilities to filter Work Items by project, assignee, status, priority, and resource reference.
- **FR-009**: System MUST allow cancellation (`Cancelled`) of Work Items exclusively from active/non-terminal states (`Created`, `Assigned`, `InProgress`, `Submitted`, `InReview`, `Rejected`), and MUST strictly prohibit cancellation once reached `Approved` or `Completed`.

### Key Entities *(include if feature involves data)*

- **Workflow Definition**: Represents a configured business process schema for a project. Key attributes: ID, Project ID, Name, Description, Configuration (states, transitions, guard conditions).
- **Work Item**: Represents an individual lifecycle unit of work or a batched group of assets (e.g. `ANNOTATION_BATCH`). Key attributes: ID, Workflow ID, Resource Type (e.g. annotation, annotation_batch, dataset_item, QA), Resource ID, Status, Priority, Created At, Updated At.
- **Assignment**: Represents allocation of work. Key attributes: ID, Work Item ID, Assignee ID, Assigned By, Assigned At, Due Date, Priority.
- **Workflow History (Audit Log)**: Immutable ledger of lifecycle events. Key attributes: ID, Work Item ID, From State, To State, Changed By, Changed At, Reason/Metadata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of state transitions are strictly governed by the Transition Engine; 0 illegal state jumps allowed.
- **SC-002**: 100% of state change operations produce a corresponding immutable audit log record.
- **SC-003**: State transition and validation operations execute with p95 response time under 150ms.
- **SC-004**: Work Items can reference at least 5 different domain resource types (Annotation, Review, QA, Export, Snapshot) without any schema changes to the core Workflow tables.
- **SC-005**: Users and automated test suites can trace the complete historical lifecycle of any completed or rejected Work Item from creation to termination.

## Assumptions

- **Generic Domain Boundary**: Workflow Domain manages process state and work coordination; it does not store or manipulate actual annotation labels, raw binary images, or dataset payload.
- **User & Project Existence**: User accounts, authentication, and Project boundaries are managed by the core platform / IAM domain and referenced via IDs.
- **Notifications Out-of-Scope (v1)**: Notification dispatching (Email/Slack/WebSocket) is excluded from Workflow Domain v1 to prioritize core lifecycle management.
- **Single Active Assignment**: Each Work Item has at most one primary active assignee at any given moment, though history preserves all previous assignees.

