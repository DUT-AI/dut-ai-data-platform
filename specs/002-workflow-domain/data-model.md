# Data Model: Workflow Domain

**Feature**: `002-workflow-domain` | **Date**: 2026-11-04

## 1. Relational Database Tables (PostgreSQL)

### Table: `workflow_definitions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | ULID/UUID identifier |
| `project_id` | VARCHAR(36) | NOT NULL, INDEX | Associated Project ID |
| `name` | VARCHAR(255) | NOT NULL | Human-readable name (e.g. "Standard Annotation") |
| `description` | TEXT | NULLABLE | Description of the workflow |
| `config` | JSONB | NOT NULL DEFAULT '{}' | Schema configuration (reserved for future steps) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

### Table: `work_items`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | ULID/UUID identifier |
| `workflow_id` | VARCHAR(36) | NOT NULL, FK(`workflow_definitions.id`), INDEX | Workflow reference |
| `project_id` | VARCHAR(36) | NOT NULL, INDEX | Project reference for fast querying |
| `resource_type` | VARCHAR(64) | NOT NULL, INDEX | e.g., `dataset_item`, `ANNOTATION_BATCH`, `QA`, `EXPORT` |
| `resource_id` | VARCHAR(255) | NOT NULL, INDEX | ID of the target resource or batch |
| `status` | VARCHAR(32) | NOT NULL, INDEX | Enum: `CREATED`, `ASSIGNED`, `IN_PROGRESS`, `SUBMITTED`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED` |
| `priority` | VARCHAR(16) | NOT NULL DEFAULT 'MEDIUM' | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `metadata` | JSONB | NOT NULL DEFAULT '{}' | Generic metadata (e.g. list of child asset IDs in a batch: `{"asset_ids": ["uuid-1", ...], "item_count": 50, "dataset_id": "...", "dataset_version_id": "..."}`) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

### Table: `workflow_assignments`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | ULID/UUID identifier |
| `work_item_id` | VARCHAR(36) | NOT NULL, FK(`work_items.id`), INDEX | Target Work Item |
| `assignee_id` | INTEGER | NOT NULL, INDEX | User ID of primary assignee (`int` as per constitution) |
| `assigned_by` | INTEGER | NOT NULL | User ID of assigner (`int`) |
| `due_date` | TIMESTAMPTZ | NULLABLE | Optional deadline |
| `priority` | VARCHAR(16) | NOT NULL DEFAULT 'MEDIUM' | Priority at time of assignment |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | Indicates current active assignment |
| `assigned_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Assignment timestamp |

### Table: `workflow_history`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | ULID/UUID identifier |
| `work_item_id` | VARCHAR(36) | NOT NULL, FK(`work_items.id`), INDEX | Target Work Item |
| `from_state` | VARCHAR(32) | NOT NULL | Previous state |
| `to_state` | VARCHAR(32) | NOT NULL | New state |
| `changed_by` | INTEGER | NOT NULL | User ID who triggered transition |
| `comment` | TEXT | NULLABLE | Optional feedback/comment (especially on review) |
| `metadata` | JSONB | NOT NULL DEFAULT '{}' | Contextual metadata |
| `changed_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW(), INDEX | Immutable change timestamp |

---

## 2. Pure Domain Entities (Python)

```python
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Any


class WorkItemStatus(str, Enum):
    CREATED = "CREATED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    IN_REVIEW = "IN_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class WorkItemPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


@dataclass
class WorkflowDefinitionEntity:
    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    config: dict[str, Any] = field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class WorkItemEntity:
    id: str
    workflow_id: str
    project_id: str
    resource_type: str
    resource_id: str
    status: WorkItemStatus
    priority: WorkItemPriority = WorkItemPriority.MEDIUM
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class AssignmentEntity:
    id: str
    work_item_id: str
    assignee_id: int
    assigned_by: int
    priority: WorkItemPriority = WorkItemPriority.MEDIUM
    due_date: Optional[datetime] = None
    is_active: bool = True
    assigned_at: Optional[datetime] = None


@dataclass
class WorkflowHistoryEntity:
    id: str
    work_item_id: str
    from_state: WorkItemStatus
    to_state: WorkItemStatus
    changed_by: int
    comment: Optional[str] = None
    metadata: dict[str, Any] = field(default_factory=dict)
    changed_at: Optional[datetime] = None
```

