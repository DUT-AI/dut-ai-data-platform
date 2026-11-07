from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


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
    description: str | None = None
    config: dict[str, Any] = field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class WorkItemEntity:
    id: str
    workflow_id: str
    project_id: str
    resource_type: str
    resource_id: str
    status: WorkItemStatus = WorkItemStatus.CREATED
    priority: WorkItemPriority = WorkItemPriority.MEDIUM
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class AssignmentEntity:
    id: str
    work_item_id: str
    assignee_id: int
    assigned_by: int
    priority: WorkItemPriority = WorkItemPriority.MEDIUM
    due_date: datetime | None = None
    is_active: bool = True
    assigned_at: datetime | None = None


@dataclass
class WorkflowHistoryEntity:
    id: str
    work_item_id: str
    from_state: WorkItemStatus
    to_state: WorkItemStatus
    changed_by: int
    comment: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    changed_at: datetime | None = None

